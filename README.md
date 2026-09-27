# MORROW — AI Demand Forecasting & Inventory Intelligence

> *“A little ahead of demand.”*

[![CI Pipeline](https://github.com/M-Piyush-21/MORROW/actions/workflows/ci.yml/badge.svg)](https://github.com/M-Piyush-21/MORROW/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![DVC](https://img.shields.io/badge/DVC-3.48+-945DD6?logo=dvc&logoColor=white)](https://dvc.org)
[![MLflow](https://img.shields.io/badge/MLflow-2.11+-0194E2?logo=mlflow&logoColor=white)](https://mlflow.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)

**MORROW** is an enterprise-grade demand intelligence and inventory optimization platform built for retail enterprises and modern grocers. Powered by machine learning and strict MLOps standards, MORROW transforms raw, granular transaction logs into accurate multi-horizon demand forecasts, proactive purchase order recommendations, and inventory risk monitoring.

---

## 📑 Table of Contents

1. [Product Overview](#-product-overview)
2. [System Architecture](#-system-architecture)
3. [Repository Structure](#-repository-structure)
4. [Dataset & Data Engineering](#-dataset--data-engineering)
5. [Machine Learning Pipeline](#-machine-learning-pipeline)
6. [Measured Evaluation Results](#-measured-evaluation-results)
7. [MLOps & Reproducibility](#-mlops--reproducibility)
8. [Getting Started Locally](#-getting-started-locally)
9. [API Documentation](#-api-documentation)
10. [Docker & Containerization](#-docker--containerization)
11. [CI/CD & Docker Hub Setup](#-cicd--docker-hub-setup)
12. [Troubleshooting & Limitations](#-troubleshooting--limitations)

---

## 🌟 Product Overview

Retail businesses routinely face the twin perils of stockouts (forfeiting revenue and customer trust) and overstocking (tying up working capital and suffering spoilage). 

**MORROW** bridges the gap between machine learning forecasting research and front-line inventory operations:
* **Interactive Forecasts:** Generates 7-, 14-, and 30-day recursive SKU forecasts with confidence intervals.
* **Transparent Replenishment:** Calculates purchase orders using deterministic, verifiable formulas:
  $$\text{Reorder Point} = (\text{Avg Daily Demand} \times \text{Lead Time}) + \text{Safety Stock}$$
  $$\text{Suggested Order Qty} = \max(0, \text{Target Stock Level} - \text{Current Stock})$$
* **Interactive What-If Simulation:** Allows operations managers to test vendor lead time disruptions and safety stock buffers on-the-fly.
* **Resilient Architecture:** Full-stack architecture with FastAPI backend serving real ML models, plus an offline fallback mode so operations never freeze.

---

## 🏗 System Architecture

```text
┌────────────────────────────────────────────────────────┐
│           MORROW Frontend (React 18 + Vite)           │
│  • Dashboard  • Inventory  • Forecast  • Restock  • Model │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP REST (JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│           FastAPI Backend Service (Port 8000)          │
│  • /api/health               • /api/forecast/{sku}     │
│  • /api/dashboard/summary    • /api/recommendations    │
│  • /api/products             • /api/model/metrics      │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   ML Inference Engine    │  │   Local SQLite MLflow    │
│ • Random Forest Model    │  │ • Tracking URI:          │
│ • Recursive Predictor    │  │   sqlite:///mlruns.db    │
│ • Shift-1 Leak-Free Feat │  │ • Metrics & Artifacts    │
└─────────────▲────────────┘  └──────────────────────────┘
              │
              │ DVC Multi-Stage Pipeline (dvc repro)
┌─────────────┴──────────────────────────────────────────┐
│   Data Engineering & Training Pipeline                 │
│ 1. prepare_data: Excel -> Interim -> Processed Parquet  │
│ 2. build_features: Shift(1) Lags & Rolling Statistics  │
│ 3. train: Chronological split -> Train Random Forest   │
│ 4. evaluate: Test set evaluation against Lag-7 Baseline│
└────────────────────────────────────────────────────────┘
```

Detailed architecture diagrams and request flows are documented in [docs/architecture.md](docs/architecture.md).

---

## 📂 Repository Structure

```text
MORROW/
├── backend/
│   ├── app/                          # FastAPI Web Service
│   │   ├── main.py                   # App entrypoint & CORS config
│   │   ├── config.py                 # Pydantic Settings
│   │   ├── schemas.py                # Pydantic request/response schemas
│   │   ├── routers/                  # Modular API routers
│   │   │   ├── health.py             # GET /api/health
│   │   │   ├── dashboard.py          # GET /api/dashboard/summary
│   │   │   ├── products.py           # GET /api/products, /categories, /sales
│   │   │   ├── forecasts.py          # GET /api/forecast/{sku}?horizon=7
│   │   │   ├── restock.py            # GET /api/recommendations/restock
│   │   │   └── model.py              # GET /api/model/metrics, /comparison
│   │   ├── services/                 # Business logic service layer
│   │   │   ├── dashboard_service.py
│   │   │   ├── product_service.py
│   │   │   ├── forecast_service.py
│   │   │   ├── restock_service.py
│   │   │   └── model_service.py
│   │   └── ml/
│   │       └── predictor.py          # Singleton inference loader
│   │
│   ├── ml/                           # ML Pipeline Scripts (DVC Stages)
│   │   ├── prepare_data.py           # Stage 1: Clean transactions & aggregate
│   │   ├── build_features.py         # Stage 2: Leak-free feature engineering
│   │   ├── train.py                  # Stage 3: Train Random Forest & log MLflow
│   │   ├── evaluate.py               # Stage 4: Test set evaluation & comparison
│   │   ├── predict.py                # Multi-step recursive forecasting engine
│   │   └── utils.py                  # Logging and parameter helpers
│   │
│   ├── data/
│   │   ├── raw/                      # Raw dataset (Online Retail.xlsx, DVC tracked)
│   │   ├── interim/                  # Cleaned transactions (.parquet)
│   │   └── processed/                # Daily demand & feature matrices (.parquet)
│   │
│   ├── models/                       # Trained models & metadata (.joblib, .json)
│   ├── reports/
│   │   ├── figures/                  # Validation & error distribution plots
│   │   └── metrics/                  # Evaluation JSON summaries
│   ├── tests/                        # Pytest unit & integration test suite
│   ├── requirements.txt              # Pinned Python dependencies
│   ├── Dockerfile                    # Container definition for backend
│   └── .env.example                  # Backend environment template
│
├── src/                              # React 18 + TypeScript Frontend
│   ├── components/                   # UI primitives, layout, and chart widgets
│   ├── context/                      # AppContext for live state & theme
│   ├── pages/                        # 7 Core Workspaces (Dashboard, Forecast, etc.)
│   ├── services/                     # Real API client (api.ts) & fallback (mockApi.ts)
│   └── types/                        # Domain TypeScript interfaces
│
├── docs/
│   ├── architecture.md               # Subsystem architecture & data flow
│   ├── data_dictionary.md            # Raw schema, cleaning rules & features
│   ├── ml_experiment.md              # Real experimental metrics & setup
│   ├── demo_runbook.md               # 5-7 minute live presentation guide
│   └── presentation_notes.md         # 10-slide deck outline
│
├── dvc.yaml                          # DVC multi-stage pipeline configuration
├── dvc.lock                          # DVC pipeline state lockfile
├── params.yaml                       # Configurable pipeline parameters
├── docker-compose.yml                # Multi-container local orchestration
├── Dockerfile.frontend               # Production NGINX container definition
├── .github/workflows/
│   ├── ci.yml                        # GitHub Actions CI for tests & builds
│   └── docker-publish.yml            # Docker Hub publishing workflow
└── README.md
```

---

## 📊 Dataset & Data Engineering

* **Dataset:** [UCI Machine Learning Repository: Online Retail Dataset](https://archive.ics.uci.edu/dataset/352/online+retail)
* **Raw Records:** 541,909 transactions across 4,070 SKUs (`2010-12-01` to `2011-12-09`).
* **Location:** Placed in `backend/data/raw/Online Retail.xlsx` and tracked via DVC (`backend/data/raw/Online Retail.xlsx.dvc`).

### Preprocessing Policies
1. **Deduplication:** 5,268 exact duplicate transactions removed.
2. **Returns & Cancellations:** 10,587 transactions starting with `C` or with non-positive quantities are excluded from outbound positive demand modeling. In retail supply chain planning, demand forecasting predicts customer outbound purchasing velocity; treating prior-period returns as negative daily demand distorts sales momentum.
3. **Continuous Calendar Reindexing:** Modeled SKUs are expanded to a continuous 374-day calendar, correctly imputing non-sale days with zero demand (34.0% zero-demand ratio).

See [docs/data_dictionary.md](docs/data_dictionary.md) for full column schemas and transformations.

---

## 🧬 Machine Learning Pipeline

### Feature Engineering (Strict No-Leakage Guarantee)
To ensure that future actual values never leak into training:
* **Lags:** $t-1, t-7, t-14, t-21, t-28$.
* **Rolling Statistics:** 7-day, 14-day, and 28-day rolling averages and standard deviations are computed on `quantity.shift(1)`. Day $t$'s actual sales are strictly excluded when computing features for day $t$.
* **Calendar Signals:** Day of week, day of month, month, weekend indicator, and unit price.

### Chronological Splits (No Random Splitting)
* **Train:** `2010-12-01` to `2011-08-31` (12,300 observations)
* **Validation:** `2011-09-01` to `2011-10-14` (2,200 observations)
* **Test:** `2011-10-15` to `2011-12-09` (2,800 observations)

---

## 📈 Measured Evaluation Results

> All metrics below were computed directly on the held-out test split of 2,800 observations.

| Metric | Naive Seasonal Baseline (Lag-7) | Random Forest Regressor (MORROW) | Improvement |
|---|---|---|---|
| **Mean Absolute Error (MAE)** | **80.64 units** | **67.45 units** | **+16.4% error reduction** |
| **Root Mean Squared Error (RMSE)** | **241.16 units** | **186.58 units** | **+22.6% error reduction** |
| **Weighted Absolute % Error (WAPE)** | **99.49%** | **83.21%** | **+16.3% accuracy gain** |
| **Coefficient of Determination ($R^2$)** | **-0.405** | **+0.159** | **Significant variance captured** |
| **Non-Zero MAPE** | **99.5%** | **78.4%** | **+21.1% gain on active sale days** |

See [docs/ml_experiment.md](docs/ml_experiment.md) for full metrics breakdown and residual analysis.

---

## 🔄 MLOps & Reproducibility

### DVC Pipeline
To reproduce the complete pipeline from raw data to model evaluation:
```bash
dvc repro
```
This checks hashes, executes outdated stages, and produces versioned outputs:
1. `prepare_data` $\rightarrow$ `cleaned_transactions.parquet`, `daily_demand.parquet`
2. `build_features` $\rightarrow$ `features.parquet`
3. `train` $\rightarrow$ `random_forest_demand.joblib`, `model_metadata.json`
4. `evaluate` $\rightarrow$ `evaluation_metrics.json`, `actual_vs_predicted.png`

### MLflow Tracking Server
All training hyperparameters and evaluation runs are logged to `sqlite:///mlruns.db`.
To launch the interactive MLflow UI:
```bash
.venv/bin/mlflow ui --backend-store-uri sqlite:///mlruns.db --port 5000
```
Then visit `http://localhost:5000`.

---

## 🚀 Getting Started Locally

### Prerequisites
* **macOS / Linux / Windows WSL2**
* **Python 3.12**
* **Node.js 18+ or 20+**
* **Git**

### Step 1: Clone & Python Environment Setup
```bash
git clone https://github.com/M-Piyush-21/MORROW.git
cd MORROW

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 2: Ensure Dataset is Present
The dataset is tracked via DVC. If running from a fresh clone:
```bash
# Place "Online Retail.xlsx" in backend/data/raw/ if not using remote DVC storage
ls -lh "backend/data/raw/Online Retail.xlsx"

# Run the full pipeline
dvc repro
```

### Step 3: Run Backend Tests
```bash
PYTHONPATH=. pytest backend/tests -v
```

### Step 4: Start the FastAPI Backend Server
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Test that the backend is live:
```bash
curl http://localhost:8000/api/health
```

### Step 5: Start the Frontend Application
In a separate terminal window:
```bash
# Install frontend packages
npm install

# Start Vite development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📡 API Documentation

When the backend is running, interactive Swagger UI documentation is available at:
👉 **`http://localhost:8000/api/docs`**

### Key Endpoints:
* `GET /api/health` — System status, dataset and model loading checks.
* `GET /api/dashboard/summary` — Aggregated inventory metrics, 30-day sales vs 7-day forecast.
* `GET /api/products` — Full product catalog with actual demand velocities and stock statuses.
* `GET /api/forecast/{product_id}?horizon=7` — Recursive forecast with confidence intervals.
* `GET /api/recommendations/restock` — Prioritized purchase orders with stockout timelines.
* `GET /api/model/metrics` — Live measured test metrics (MAE, RMSE, WAPE).
* `GET /api/model/comparison` — Benchmark against naive seasonal lag-7 baseline.

---

## 🐳 Docker & Containerization

### Run Everything with Docker Compose:
```bash
docker-compose up --build
```
This orchestrates 3 connected services:
* **Backend:** `http://localhost:8000` (FastAPI)
* **Frontend:** `http://localhost:3000` (NGINX SPA)
* **MLflow:** `http://localhost:5000` (MLflow Tracking UI)

---

## 🔒 CI/CD & Docker Hub Setup

### GitHub Actions Workflows:
* **`ci.yml`**: Runs on every push and pull request. Validates DVC configuration, runs the complete 10-test Pytest suite, and builds the frontend production bundle.
* **`docker-publish.yml`**: Automatically builds and pushes versioned images to Docker Hub on release tags (`v*.*.*`) or master merges.

### Required GitHub Secrets for Publishing:
In your GitHub Repository $\rightarrow$ **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**:
1. `DOCKERHUB_USERNAME`: Your Docker Hub username.
2. `DOCKERHUB_TOKEN`: Personal Access Token from Docker Hub (**Account Settings** $\rightarrow$ **Security** $\rightarrow$ **New Access Token**).

---

## ⚠️ Troubleshooting & Limitations

1. **Port Conflicts:** If port `8000` or `5173` is occupied:
   - Change backend port: `uvicorn backend.app.main:app --port 8001`
   - Update `.env`: `VITE_API_BASE_URL=http://localhost:8001/api`
2. **Missing Raw Dataset:** If `Online Retail.xlsx` is missing, download it from the [UCI Repository](https://archive.ics.uci.edu/dataset/352/online+retail) and save it to `backend/data/raw/Online Retail.xlsx`, then run `dvc repro`.
3. **Data Limitations:** The UCI dataset records transactions rather than live physical warehouse shelf counts. Current stock levels and lead times in the demo are calculated from safe inventory run-rates, with fully editable parameters in the Restock workspace.

---

## 📜 License & Attribution

* **Software:** MIT License
* **Dataset Attribution:** Daqing Chen, London South Bank University. Online Retail Dataset hosted by UCI Machine Learning Repository (CC BY 4.0).
