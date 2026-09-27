import sys
from pathlib import Path

# Add project root and backend to sys.path for Vercel Serverless Function execution
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.main import app
except ModuleNotFoundError:
    from app.main import app
