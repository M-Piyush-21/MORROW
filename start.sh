#!/usr/bin/env bash
# ==============================================================================
# MORROW One-Command Startup & Demo Orchestrator
# ==============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "======================================================================"
echo " Starting MORROW Demand Forecasting & Inventory Intelligence Platform "
echo "======================================================================"

# 1. Check Python & Node prerequisites
command -v python3 >/dev/null 2>&1 || { echo >&2 "[ERROR] Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "[ERROR] Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "[ERROR] npm is required but not installed."; exit 1; }

# 2. Check virtual environment
if [ -d "venv" ]; then
    echo "[INFO] Activating virtual environment (venv)..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "[INFO] Activating virtual environment (.venv)..."
    source .venv/bin/activate
else
    echo "[INFO] Using system python3 environment: $(python3 --version)"
fi

# 3. Verify Node dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing frontend dependencies (npm install)..."
    npm install
fi

# 4. Verify sample data & model artifact
if [ ! -f "backend/data/processed/daily_demand.parquet" ] || [ ! -f "backend/models/random_forest_demand.joblib" ]; then
    echo "[INFO] Essential data/model artifacts missing. Running pipeline initialization..."
    python3 backend/ml/pipeline.py --smoke-test
fi

# 5. Trap signals to kill background backend on exit
cleanup() {
    echo ""
    echo "[INFO] Shutting down MORROW servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Start FastAPI Backend in background
echo "[INFO] Starting FastAPI Backend on http://localhost:8000..."
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend health check
echo "[INFO] Waiting for backend API to be ready..."
for i in {1..20}; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo "[INFO] Backend API is healthy!"
        break
    fi
    sleep 0.5
done

# 7. Start Frontend Vite Dev Server
echo "[INFO] Starting Vite Frontend on http://localhost:5173..."
npm run dev
