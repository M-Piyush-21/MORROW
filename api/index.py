import sys
import threading
import time
import traceback
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.responses import Response

# Locate project root and backend directory for the Vercel Python runtime.
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

for p in (str(BACKEND_DIR), str(ROOT_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

# Paths that must answer before pandas, the model, or the dataset are imported.
# A cold Vercel instance otherwise spends the whole health check booting that stack.
_FAST_PATHS = {"/", "/api", "/health", "/api/health"}

_full_app = None
_load_lock = threading.Lock()

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


def _is_fast_path(path: str) -> bool:
    normalized = path.rstrip("/") or "/"
    return normalized in _FAST_PATHS


def _health_payload() -> dict:
    from datetime import datetime
    from backend.app.config import settings

    weights = settings.MODEL_PATH.parent / "rf_weights.npz"
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "modelLoaded": settings.MODEL_PATH.exists() or weights.exists(),
        "datasetLoaded": settings.PROCESSED_DATA_PATH.exists(),
    }


def get_full_app():
    """Import the forecasting app once per warm instance."""
    global _full_app
    if _full_app is not None:
        return _full_app
    with _load_lock:
        if _full_app is not None:
            return _full_app
        started = time.perf_counter()
        from backend.app.main import app as full_app
        _full_app = full_app
        elapsed_ms = (time.perf_counter() - started) * 1000.0
        print(f"Morrow API ready in {elapsed_ms:.0f} ms", flush=True)
        return _full_app


async def _forward(inner, request: Request) -> Response:
    body = await request.body()
    status_code = 500
    raw_headers: list[tuple[bytes, bytes]] = []
    chunks = bytearray()

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        nonlocal status_code, raw_headers
        if message["type"] == "http.response.start":
            status_code = message["status"]
            raw_headers = list(message.get("headers") or [])
        elif message["type"] == "http.response.body":
            chunks.extend(message.get("body") or b"")

    scope = dict(request.scope)
    scope["app"] = inner
    await inner(scope, receive, send)

    headers: dict[str, str] = {}
    for key, value in raw_headers:
        if key.lower() == b"content-length":
            continue
        headers[key.decode("latin-1")] = value.decode("latin-1")

    return Response(content=bytes(chunks), status_code=status_code, headers=headers)


@app.middleware("http")
async def route_request(request: Request, call_next):
    if _is_fast_path(request.url.path):
        return await call_next(request)
    try:
        full_app = get_full_app()
    except Exception as exc:
        err_trace = traceback.format_exc()
        print("STARTUP FATAL ERROR in api/index.py:", err_trace, file=sys.stderr)
        return JSONResponse(
            status_code=500,
            content={
                "error": "STARTUP_IMPORT_FAILED",
                "message": str(exc),
                "traceback": err_trace,
            },
            headers={"Cache-Control": "no-store"},
        )
    return await _forward(full_app, request)


@app.get("/health")
@app.get("/api/health")
def health():
    return JSONResponse(_health_payload(), headers={"Cache-Control": "no-store"})


@app.get("/")
@app.get("/api")
def root():
    return JSONResponse(
        {
            "project": "Morrow",
            "tagline": "A little ahead of demand.",
            "status": "operational",
            "api_docs": "/api/docs",
            "health_check": "/api/health",
        },
        headers={"Cache-Control": "no-store"},
    )


handler = app
