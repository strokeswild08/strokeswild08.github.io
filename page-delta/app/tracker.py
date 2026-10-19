import difflib
import hashlib
import re
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
from soupsieve import SelectorSyntaxError, compile as compile_selector


def now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def validate_selector(selector):
    try:
        compile_selector(selector)
    except SelectorSyntaxError as e:
        raise ValueError("Invalid CSS selector.") from e


def extract_text(html, selector):
    validate_selector(selector)
    soup = BeautifulSoup(html, "html.parser")
    for node in soup(["script", "style", "noscript", "template", "svg"]):
        node.decompose()
    selected = soup.select(selector)
    if not selected:
        raise ValueError("Selector matched no content. The previous snapshot was kept.")
    lines = []
    for node in selected:
        for line in node.get_text("\n", strip=True).splitlines():
            text = re.sub(r"\s+", " ", line).strip()
            if text:
                lines.append(text)
    text = "\n".join(lines)
    if not text:
        raise ValueError("Selected content is empty. The previous snapshot was kept.")
    if len(text) > 50_000:
        raise ValueError("Selected text exceeds 50,000 characters. Use a narrower selector.")
    return text


def diff_rows(before, after):
    rows = []
    for line in difflib.ndiff(before.splitlines(), after.splitlines()):
        if line.startswith("? "):
            continue
        rows.append({"type": {"+ ": "added", "- ": "removed", "  ": "same"}[line[:2]], "text": line[2:]})
    return rows


class Tracker:
    def __init__(self, path, fetch):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path, self.fetch = str(path), fetch
        self.lock = threading.Lock()
        with self.db() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS watches (
                  id INTEGER PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL,
                  selector TEXT NOT NULL, created_at TEXT NOT NULL,
                  last_checked TEXT, last_error TEXT, status TEXT NOT NULL DEFAULT 'new');
                CREATE TABLE IF NOT EXISTS snapshots (
                  id INTEGER PRIMARY KEY, watch_id INTEGER NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
                  captured_at TEXT NOT NULL, text TEXT NOT NULL, digest TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS snapshots_watch ON snapshots(watch_id, id DESC);
            """)

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=20)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def list(self):
        with self.db() as db:
            return [dict(r) for r in db.execute("SELECT w.*, (SELECT COUNT(*) FROM snapshots s WHERE s.watch_id=w.id) versions FROM watches w ORDER BY w.id DESC")]

    def create(self, name, url, selector):
        validate_selector(selector)
        with self.lock, self.db() as db:
            count = db.execute("SELECT COUNT(*) FROM watches").fetchone()[0]
            if count >= 50:
                raise ValueError("This local workspace supports up to 50 watches.")
            cursor = db.execute("INSERT INTO watches(name,url,selector,created_at) VALUES (?,?,?,?)", (name,url,selector,now()))
            return cursor.lastrowid

    def history(self, watch_id):
        with self.db() as db:
            if not db.execute("SELECT id FROM watches WHERE id=?", (watch_id,)).fetchone():
                raise KeyError(watch_id)
            return [dict(r) for r in db.execute("SELECT id,captured_at,text FROM snapshots WHERE watch_id=? ORDER BY id DESC", (watch_id,))]

    def check(self, watch_id):
        with self.lock:
            with self.db() as db:
                watch = db.execute("SELECT * FROM watches WHERE id=?", (watch_id,)).fetchone()
            if watch is None:
                raise KeyError(watch_id)
            try:
                text = extract_text(self.fetch(watch["url"]), watch["selector"])
                digest = hashlib.sha256(text.encode()).hexdigest()
                timestamp = now()
                with self.db() as db:
                    latest = db.execute("SELECT * FROM snapshots WHERE watch_id=? ORDER BY id DESC LIMIT 1", (watch_id,)).fetchone()
                    status = "baseline" if latest is None else "unchanged" if latest["digest"] == digest else "changed"
                    if status != "unchanged":
                        db.execute("INSERT INTO snapshots(watch_id,captured_at,text,digest) VALUES(?,?,?,?)", (watch_id,timestamp,text,digest))
                        db.execute("DELETE FROM snapshots WHERE watch_id=? AND id NOT IN (SELECT id FROM snapshots WHERE watch_id=? ORDER BY id DESC LIMIT 30)", (watch_id,watch_id))
                    db.execute("UPDATE watches SET last_checked=?,last_error=NULL,status=? WHERE id=?", (timestamp,status,watch_id))
                return {"status": status, "checked_at": timestamp}
            except (ValueError, OSError) as e:
                with self.db() as db:
                    db.execute("UPDATE watches SET last_checked=?,last_error=?,status='error' WHERE id=?", (now(),str(e),watch_id))
                raise ValueError(str(e)) from e
