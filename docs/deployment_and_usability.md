# MORROW: Deployment, Usability & Architecture Guide

This guide details local reproducibility, environment configuration, cloud demo deployment architecture, security posture, operational cost estimates, and usability principles.

---

## 1. Quickstart & One-Command Local Startup

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.12)
- **Node.js**: 18.0+ & npm 9+
- **Docker & Docker Compose** *(optional for containerized deployment)*

### Single-Command Startup
To verify dependencies, seed required sample data, compile assets, and launch both FastAPI backend and Vite frontend with hot-reload:

```bash
chmod +x ./start.sh
./start.sh
```

The script automatically:
1. Validates Python and Node runtimes.
2. Creates/activates virtual environment if present.
3. Installs missing npm packages if needed.
4. Checks processed datasets and model artifacts (runs pipeline initialization if missing).
5. Starts the FastAPI backend at `http://localhost:8000` with background health polling.
6. Starts the Vite frontend dev server at `http://localhost:5173`.
7. Traps `SIGINT` to cleanly terminate background backend processes upon `Ctrl+C`.

---

## 2. Docker Compose Multi-Container Setup

For containerized execution with an embedded MLflow UI:

```bash
# Build and run backend, frontend, and MLflow UI
docker compose up --build
```

| Service | Port | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Backend API** | `8000` | `http://localhost:8000/api` | FastAPI application with OpenAPI docs at `/docs` |
| **Frontend UI** | `3000` | `http://localhost:3000` | Production Nginx container serving React SPA bundle |
| **MLflow UI** | `5000` | `http://localhost:5000` | Experiment tracking dashboard and Model Registry |

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` to customize settings:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Frontend base URL for backend REST API calls |
| `VITE_DEMO_MODE` | `true` | Enables offline mock fallbacks if backend is unreachable |
| `ENVIRONMENT` | `development` | App environment (`development` / `production`) |
| `MLFLOW_TRACKING_URI` | `sqlite:///mlruns.db` | Local SQLite backend store for MLflow tracking |
| `MLFLOW_EXPERIMENT_NAME`| `morrow_demand_forecasting`| Default MLflow experiment namespace |
| `HOST` | `0.0.0.0` | Server bind IP |
| `PORT` | `8000` | Server HTTP port |

---

## 4. Seed Data & Sample Workflows

The repository ships with cleaned sample data from the **UCI Online Retail** dataset:
- **Raw/Cleaned Daily Aggregates**: `backend/data/processed/daily_demand.parquet` (17,300 daily SKU transaction rows across 50 active items).
- **Leak-Free Featured Dataset**: `backend/data/processed/features.parquet` (Includes lags `[1, 7, 14, 21, 28]`, rolling means/stds `[7, 14, 28]`, day of week, unit price).
- **Production Model Artifact**: `backend/models/random_forest_demand.joblib` (Random Forest Regressor with 80% conformal prediction interval calibration).

### Running End-to-End Pipeline Smoke Test
```bash
# Runs data validation, feature engineering, model training, evaluation, and promotion gate checks in ~7s
python3 backend/ml/pipeline.py --smoke-test --skip-prepare
```

---

## 5. Cloud Demo Deployment Architecture

For demonstrating MORROW in cloud environments (e.g. AWS ECS Fargate or Google Cloud Run):

```mermaid
graph LR
    Client[Web Browser] --> CDN[Cloudflare / CloudFront CDN]
    CDN --> FrontendContainer[Nginx SPA Container (Port 80)]
    Client --> ALB[Application Load Balancer / API Gateway]
    ALB --> BackendContainer[FastAPI Container (Port 8000)]
    BackendContainer --> MLflowDB[(Persistent SQLite / RDS Postgres)]
    BackendContainer --> S3[(S3 / GCS Artifact Bucket)]
```

### Recommended Stateless Container Architecture
1. **Frontend**: Static Nginx Alpine container serving built Vite assets (`dist/`). Can also be deployed directly to Cloudflare Pages or AWS S3 + CloudFront with zero compute costs.
2. **Backend**: FastAPI container deployed on Google Cloud Run or AWS ECS Fargate (0.5 vCPU, 1 GB RAM). Auto-scales to zero when idle.
3. **Tracking & Models**: MLflow SQLite/PostgreSQL store and model artifact storage on S3 or Google Cloud Storage.

### Security Posture
- **Principle of Least Privilege**: Containers run as non-root users (`uid 10001`).
- **CORS Allowlist**: Configured strictly via `BACKEND_CORS_ORIGINS` in `backend/app/config.py`.
- **Stateless Serving**: No sensitive customer credentials or credit card data are accepted or retained.
- **Input Validation**: Pydantic schemas enforce type safety, bounds checks on forecast horizons (`1 <= horizon <= 30`), and structured 404/422 responses for unknown SKU IDs.
- **Model Deserialization Protection**: Model files are loaded from verified local model paths; candidate models must pass safety inference tests before activation.

### Estimated Monthly Cloud Cost (Demo Profile)
| Component | Service | Tier / Sizing | Estimated Cost |
| :--- | :--- | :--- | :--- |
| **Frontend Hosting** | Cloudflare Pages / AWS S3 | Free Tier / Serverless | $0.00 / month |
| **API Compute** | Google Cloud Run / AWS Fargate | 0.5 vCPU, 1 GB (Scale-to-Zero) | ~$2.00 - $5.00 / month |
| **Storage & Artifacts** | AWS S3 / GCS | < 5 GB artifacts | < $0.20 / month |
| **Total Demo Cost** | | | **~$3.00 - $6.00 / month** |

### Known Limitations of Demo Instance
1. **Synthetic Inventory Inputs**: Physical warehouse inventory levels, on-hand stocks, and in-transit shipments are simulated scenario parameters for policy evaluation; they are **not connected to a live physical warehouse WMS/ERP**.
2. **Single-Region Serving**: The demo runs in a single availability zone. For enterprise multi-region redundancy, a distributed database (e.g. Aurora PostgreSQL) and multi-region read replicas would be required.
3. **Synchronous Inference**: Inference latency is low (~10-25 ms) for single SKU forecasts. Batch scoring for 100,000+ SKUs should be scheduled via asynchronous Celery/Ray workers.

---

## 6. Usability Principles: Decision & Exception Focus

Rather than cluttering the interface with charts that do not change operational actions, MORROW prioritizes:
1. **Clear Action Triggers**: Highlighting items where `Inventory Position <= Reorder Point` with prominent action buttons.
2. **Exception Filtering**: Instant toggles for "Action Required", "Critical Out-of-Stock Risk", and "Constrained Orders (MOQ / Batch Applied)".
3. **Visible Math**: Revealing every term of the inventory equation ($d$, $L$, $d \times L$, $SS$, $ROP$, $S_{\text{current}}$, $S_{\text{target}}$, $Q_{\text{order}}$) to build operator trust.
4. **Scenario Sandbox**: Allowing buyers to test supplier delays (+2d, +5d) or demand spikes before placing binding purchase orders.
