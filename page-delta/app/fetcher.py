"""Bounded public HTTP fetching; validated DNS addresses are pinned at connect time."""
import http.client
import ipaddress
import socket
import ssl
from urllib.parse import urlsplit, urljoin, urlunsplit

MAX_BYTES = 2_000_000


class FetchError(ValueError):
    pass


def validate_url(url: str):
    try:
        p = urlsplit(url)
        if p.scheme not in {"http", "https"} or not p.hostname or p.username is not None or p.password is not None:
            raise FetchError("Use a public HTTP(S) URL without embedded credentials.")
        if p.port not in {None, 80 if p.scheme == "http" else 443}:
            raise FetchError("Only standard web ports are supported.")
        if any(ord(c) < 33 or ord(c) == 127 for c in url):
            raise FetchError("The URL contains invalid whitespace or control characters.")
        host = p.hostname.encode("idna").decode("ascii")
        return p, host
    except (ValueError, UnicodeError) as e:
        raise FetchError(str(e)) from e


def public_address(host, port):
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError as e:
        raise FetchError("Could not resolve this website.") from e
    if not addresses:
        raise FetchError("No address found.")
    # Reject mixed public/private DNS answers as well as private literals.
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global or ip.is_multicast or getattr(ip, "ipv4_mapped", None) is not None:
            raise FetchError("Only public internet addresses can be checked.")
    return addresses[0][4][0]


class PinnedHTTP(http.client.HTTPConnection):
    def __init__(self, host, port, address, secure):
        super().__init__(host, port, timeout=10)
        self.address, self.secure = address, secure

    def connect(self):
        self.sock = socket.create_connection((self.address, self.port), self.timeout)
        if self.secure:
            self.sock = ssl.create_default_context().wrap_socket(self.sock, server_hostname=self.host)


def fetch_html(url: str) -> str:
    for _ in range(4):
        p, host = validate_url(url)
        port = p.port or (443 if p.scheme == "https" else 80)
        address = public_address(host, port)
        connection = PinnedHTTP(host, port, address, p.scheme == "https")
        try:
            target = urlunsplit(("", "", p.path or "/", p.query, ""))
            connection.request("GET", target, headers={"User-Agent": "PageDelta/1.0 (manual public-page text monitor)", "Accept": "text/html,text/plain", "Accept-Encoding": "identity"})
            response = connection.getresponse()
            if response.status in {301, 302, 303, 307, 308}:
                location = response.getheader("Location")
                if not location:
                    raise FetchError("Redirect has no destination.")
                url = urljoin(url, location)
                continue
            if response.status != 200:
                raise FetchError(f"Website returned HTTP {response.status}.")
            if response.getheader("Content-Encoding", "identity").lower() != "identity":
                raise FetchError("Compressed responses are not supported.")
            content_type = response.getheader("Content-Type", "").lower()
            if not any(t in content_type for t in ("text/html", "application/xhtml+xml", "text/plain")):
                raise FetchError("This address did not return a text or HTML page.")
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise FetchError("Page exceeds the 2 MB size limit.")
            charset = response.headers.get_content_charset() or "utf-8"
            try:
                return data.decode(charset, errors="replace")
            except LookupError:
                return data.decode("utf-8", errors="replace")
        except (OSError, http.client.HTTPException, UnicodeError) as e:
            raise FetchError("Website could not be fetched within the connection limits.") from e
        finally:
            connection.close()
    raise FetchError("Too many redirects.")
