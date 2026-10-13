import sys
from pathlib import Path

# Locate project root and backend directory for Vercel Serverless Function runtime
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.main import app
    handler = app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    err_trace = traceback.format_exc()
    print("STARTUP FATAL ERROR in api/index.py:", err_trace, file=sys.stderr)

    app = FastAPI(title="Morrow Fallback Error Handler")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def fallback_handler(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "STARTUP_IMPORT_FAILED",
                "message": str(e),
                "traceback": err_trace,
            },
        )

    handler = app
