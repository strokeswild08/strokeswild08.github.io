import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .fetcher import fetch_html, validate_url
from .tracker import Tracker, diff_rows

ROOT = Path(__file__).resolve().parent.parent


class WatchInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    url: str = Field(min_length=8, max_length=2000)
    selector: str = Field(default="main", min_length=1, max_length=200)


def create_app(db_path=None, fetch=None):
    app = FastAPI(title="Page Delta", version="1.0.0")
    tracker = Tracker(db_path or os.environ.get("PAGE_DELTA_DB", str(ROOT / "data/tracker.sqlite3")), fetch or fetch_html)
    app.state.tracker = tracker

    @app.middleware("http")
    async def guard_origin(request: Request, call_next):
        # Local UI only; prevent cross-origin form writes to a running local service.
        origin = request.headers.get("origin")
        if request.method not in {"GET", "HEAD", "OPTIONS"} and origin and origin != str(request.base_url).rstrip("/"):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Cross-origin writes are disabled."}, status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    @app.get("/api/meta")
    def meta():
        return {"mode": "live", "version": "1.0.0", "storage": "SQLite", "checks": "manual"}

    @app.get("/api/watches")
    def watches():
        return tracker.list()

    @app.post("/api/watches", status_code=201)
    def create(body: WatchInput):
        try:
            validate_url(body.url)
            name = body.name.strip()
            if not name:
                raise ValueError("Please enter a watch name.")
            return {"id": tracker.create(name, body.url, body.selector)}
        except ValueError as e:
            raise HTTPException(400, str(e)) from e

    @app.post("/api/watches/{watch_id}/check")
    def check(watch_id: int):
        try:
            return tracker.check(watch_id)
        except KeyError:
            raise HTTPException(404, "Watch not found.")
        except ValueError as e:
            raise HTTPException(400, str(e)) from e

    @app.get("/api/watches/{watch_id}/history")
    def history(watch_id: int):
        try:
            return tracker.history(watch_id)
        except KeyError:
            raise HTTPException(404, "Watch not found.")

    @app.get("/api/watches/{watch_id}/diff")
    def diff(watch_id: int, before: int, after: int):
        try:
            versions = {v["id"]: v for v in tracker.history(watch_id)}
            if before not in versions or after not in versions:
                raise KeyError(watch_id)
            return diff_rows(versions[before]["text"], versions[after]["text"])
        except KeyError:
            raise HTTPException(404, "Watch or snapshot not found.")

    app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
    return app


app = create_app()
