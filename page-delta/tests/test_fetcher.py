import socket
import pytest
from email.message import Message
from app import fetcher


@pytest.mark.parametrize('url', ['file:///etc/passwd','ftp://example.com','https://user:pass@example.com','http://example.com:8080','https://example.com/a\r\nHost:x','http://'])
def test_url_boundaries(url):
    with pytest.raises(fetcher.FetchError): fetcher.validate_url(url)


@pytest.mark.parametrize('address', ['127.0.0.1','10.1.2.3','169.254.169.254','::1','fc00::1','224.0.0.1','0.0.0.0','::ffff:8.8.8.8'])
def test_nonpublic_dns_rejected(monkeypatch,address):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**k:[(socket.AF_INET,socket.SOCK_STREAM,6,'',(address,443))])
    with pytest.raises(fetcher.FetchError): fetcher.public_address('test.example',443)


def test_mixed_dns_rejected(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**k:[(2,1,6,'',('8.8.8.8',443)),(2,1,6,'',('127.0.0.1',443))])
    with pytest.raises(fetcher.FetchError): fetcher.public_address('test.example',443)


def test_socket_uses_validated_address_and_tls_hostname(monkeypatch):
    sentinel = object()
    calls=[]
    monkeypatch.setattr(socket,'create_connection',lambda endpoint,timeout: calls.append(endpoint) or sentinel)
    class TLS:
        def wrap_socket(self,sock,server_hostname):
            assert sock is sentinel and server_hostname=='public.example'
            return sentinel
    monkeypatch.setattr(fetcher.ssl,'create_default_context',lambda:TLS())
    connection=fetcher.PinnedHTTP('public.example',443,'8.8.8.8',True)
    connection.connect()
    assert calls==[('8.8.8.8',443)]


def mock_responses(monkeypatch, responses):
    connections=[]
    class Response:
        def __init__(self,config):
            self.status=config.get('status',200);self.config=config
            self.headers=Message();self.headers['Content-Type']=config.get('type','text/html; charset=utf-8')
        def getheader(self,key,default=None):
            return {'Content-Type':self.headers['Content-Type'],'Location':self.config.get('location'),'Content-Encoding':self.config.get('encoding','identity')}.get(key,default)
        def read(self,n):return self.config.get('body',b'<main>OK</main>')[:n]
    class Connection:
        def __init__(self,*args):connections.append(args)
        def request(self,*args,**kwargs):pass
        def getresponse(self):return Response(responses.pop(0))
        def close(self):pass
    monkeypatch.setattr(fetcher,'PinnedHTTP',Connection)
    def address(host,port):
        if host=='127.0.0.1':raise fetcher.FetchError('Private redirect')
        return '8.8.8.8'
    monkeypatch.setattr(fetcher,'public_address',address)
    return connections


def test_redirect_is_revalidated(monkeypatch):
    connections=mock_responses(monkeypatch,[{'status':302,'location':'http://127.0.0.1/private'}])
    with pytest.raises(fetcher.FetchError):fetcher.fetch_html('https://example.com')
    assert len(connections)==1


@pytest.mark.parametrize('response',[{'status':403},{'type':'image/png'},{'body':b'x'*(fetcher.MAX_BYTES+1)},{'encoding':'gzip'}])
def test_response_boundaries(monkeypatch,response):
    mock_responses(monkeypatch,[response])
    with pytest.raises(fetcher.FetchError):fetcher.fetch_html('https://example.com')


def test_successful_public_redirect(monkeypatch):
    connections=mock_responses(monkeypatch,[{'status':302,'location':'/notes'},{'body':b'<main>New</main>'}])
    assert fetcher.fetch_html('https://example.com')=='<main>New</main>'
    assert len(connections)==2
