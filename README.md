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

## 🌟 Product Overview & Problem Statement

### 🎯 Core Problem Statement
> **"Reduce avoidable retail stockouts and costly excess stock while optimally balancing service level (fill rate), inventory holding cost, and supplier ordering costs under lead-time uncertainty."**

Retail businesses routinely face the twin perils of stockouts (forfeiting revenue and customer trust) and overstocking (tying up working capital and suffering spoilage). 

**MORROW** bridges the gap between machine learning forecasting research and front-line inventory operations:
* **The Reorder Decision Engine:** Explicitly defines *when* and *how much* to reorder for each SKU given recursive multi-horizon forecast demand, supplier lead time, safety stock buffers, current on-hand/in-transit stock, and real-world order constraints (Minimum Order Quantity [MOQ], order batch multiples, shelf capacity limits):
  $$\text{Inventory Position} = \text{Current On-Hand Stock} + \text{In-Transit (On-Order) Stock}$$
  $$\text{Reorder Point (ROP)} = \text{Forecast Demand During Lead Time} + \text{Safety Stock}$$
  $$\text{Trigger Condition: Place PO when } \text{Inventory Position} \le \text{Reorder Point}$$
  $$\text{Order Qty} = \text{Clamp}(\text{Target Stock} - \text{Inventory Position}, \text{MOQ}, \text{Batch Size}, \text{Max Capacity})$$
* **Interactive Forecasts:** Generates 7-, 14-, and 30-day recursive SKU forecasts with **empirically calibrated prediction intervals** (80% nominal confidence achieving 75.8% empirical coverage on held-out test data).
* **Inventory Policy Backtest Simulation:** Day-by-day discrete-event historical backtest comparing MORROW's dynamic forecast-driven replenishment against static heuristic baselines.
* **Configurable Scenario Inputs:** Holding cost rates, order setup fees, and stockout penalty costs are clearly labeled as configurable scenario assumptions—not audited accounting facts—enabling interactive what-if disruption stress testing.
* **Resilient Production Architecture:** Full-stack architecture with FastAPI backend serving real ML models, plus an offline fallback mode so operations never freeze.

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
│   │   ├── main.py                   # App entrypoint, latency middleware & CORS
│   │   ├── config.py                 # Pydantic Settings
│   │   ├── schemas.py                # Pydantic request/response schemas
│   │   ├── routers/                  # Modular API routers
│   │   │   ├── health.py             # GET /api/health
│   │   │   ├── dashboard.py          # GET /api/dashboard/summary
│   │   │   ├── products.py           # GET /api/products, /categories, /sales
│   │   │   ├── forecasts.py          # GET /api/forecast/{sku}?horizon=7
│   │   │   ├── restock.py            # GET /api/recommendations/restock
│   │   │   ├── simulation.py         # GET /api/inventory/backtest, POST /simulate
│   │   │   ├── model.py              # GET /api/model/metrics, POST /promote, POST /rollback
│   │   │   └── monitoring.py         # GET /api/monitoring/data-quality, /drift, /performance, /alerts, /feedback
│   │   ├── services/                 # Business logic service layer
│   │   └── ml/
│   │       └── predictor.py          # Singleton inference loader with empirical intervals
│   │
│   ├── ml/                           # ML Pipeline & MLOps Engine
│   │   ├── pipeline.py               # Repeatable end-to-end ML pipeline orchestrator
│   │   ├── promotion.py              # 8-gate automated promotion & MLflow registry engine
│   │   ├── rollback.py               # Automated model rollback & quarantine mechanism
│   │   ├── prepare_data.py           # Data quality cleaning & daily aggregation
│   │   ├── build_features.py         # Leak-free lag & rolling feature engineering
│   │   ├── train.py                  # Candidate model training & MLflow tracking
│   │   ├── evaluate.py               # Multi-horizon, segment, interval evaluation
│   │   ├── inventory_policy.py       # Sizing formulas, ROP, MOQ & batch constraints
│   │   ├── inventory_simulation.py   # Discrete-event backtesting against baselines
│   │   └── monitoring/               # Production monitoring suite
│   │       ├── data_quality.py       # Missing dates, duplicates, quantities & spikes
│   │       ├── drift.py              # Population Stability Index (PSI) feature drift
│   │       ├── performance.py        # Realized WAPE, bias & rolling accuracy
│   │       ├── service.py            # API latency percentiles, error rates & memory
│   │       ├── alerts.py             # Actionable operational alert generation
│   │       └── feedback.py           # Persistent JSONL forecast feedback loop log
│   │
│   ├── data/
│   │   ├── raw/                      # Raw dataset (Online Retail.xlsx, DVC tracked)
│   │   ├── interim/                  # Cleaned transactions (.parquet)
│   │   ├── processed/                # Daily demand & feature matrices (.parquet)
│   │   └── feedback/                 # Persistent forecast feedback log (.jsonl)
│   │
│   ├── models/                       # Active model (.joblib), metadata, archives & quarantined
│   ├── reports/                      # Evaluation, backtest, drift & monitoring metrics JSONs
│   ├── tests/                        # Pytest suite (20 unit, integration & API tests)
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

### 1. Overall Model vs. Baseline Accuracy
> Computed directly on the held-out test split of 2,800 observations (`2011-10-15` to `2011-12-09`).

| Metric | Naive Seasonal Baseline (Lag-7) | Random Forest Regressor (MORROW) | Retail Interpretation & Improvement |
|---|---|---|---|
| **Mean Absolute Error (MAE)** | **80.64 units** | **67.45 units** | **+16.4% error reduction** — daily purchase plans deviate by 13 fewer units on average. |
| **Root Mean Squared Error (RMSE)** | **241.16 units** | **186.58 units** | **+22.6% error reduction** — significantly mitigates large spike misses that threaten sudden stockouts. |
| **Weighted Absolute % Error (WAPE)** | **99.49%** | **83.21%** | **+16.3% catalog accuracy gain** — volume-weighted error that does not distort on zero-sales days. |
| **Coefficient of Determination ($R^2$)** | **-0.405** | **+0.159** | **Significant variance captured** — baseline is worse than mean; ML captures real seasonality. |
| **Non-Zero MAPE** | **99.5%** | **78.4%** | **+21.1% gain** on active non-zero transaction days. |

### 2. Multi-Horizon Recursive Evaluation (7, 14, 30 Days)
Rather than assuming one-step errors generalize across horizons, multi-step recursive forecasting was evaluated explicitly:

| Horizon | Planning Window | MORROW ML WAPE | Seasonal Baseline WAPE | Accuracy Lift |
|---|---|---|---|---|
| **7 Days** | Weekly Store Restocking | **42.7%** | 52.0% | **+17.9% improvement** |
| **14 Days** | Bi-Weekly Supplier Lead Time | **46.0%** | 55.2% | **+16.6% improvement** |
| **30 Days** | Monthly S&OP Demand Planning | **49.1%** | 58.6% | **+16.1% improvement** |

### 3. Catalog Segmentation & Intermittent-Demand Separation
* **Volume Segments:** High-volume "fast movers" achieve **73.8% WAPE** (MAE 154.9); mid-volume items achieve **85.1% WAPE**; low-volume items achieve 124.7% WAPE.
* **Intermittent Demand Policy:** Products with $\ge 30\%$ zero-sales days (9 SKUs, 36.1% zero-sales frequency) are evaluated separately. Standard MAPE is mathematically undefined/distorted on zero-demand days; evaluation relies strictly on volume-weighted WAPE (124.6%) and unit MAE (56.7 units). Regular-demand SKUs (41 SKUs, 17.7% zero-sales frequency) achieve **78.6% WAPE**.

### 4. Calibrated Prediction Interval Coverage
* **Method:** Empirical residual quantiles $[q_{10}, q_{90}]$ calibrated on the validation split (`2011-09-01` to `2011-10-15`).
* **Test Verification:** Tested against all 2,800 test observations. Nominal **80.0%** confidence intervals achieve **75.8% empirical test coverage** with an average safety buffer width of 108.4 units.

### 5. Inventory Simulation Backtest (50 SKUs, 56 Days Held-Out Test Period)
> Note: Cost parameters ($0.20/yr holding, $40/PO, $5/unit stockout) are configurable scenario assumptions for comparative analysis—not observed accounting facts.

| Operational Outcome | Fixed Baseline (Static Mean Rule) | Seasonal Baseline (Lag-7 Rule) | MORROW ML Dynamic Policy | Operational Gain |
|---|---|---|---|---|
| **Simulated Stockout Days** | 219 days | 200 days | **187 days** | **-14.6% fewer stockout days** |
| **Units Short (Unmet Demand)** | 59,788 units | 55,831 units | **56,247 units** | **-5.9% reduction in units short** |
| **Fill Rate (Service Level)** | 73.66% | 75.40% | **75.22%** | **+1.56% fill rate improvement** |
| **Cycle Service Level** | 92.18% | 92.86% | **93.32%** | **+1.14% non-stockout days** |
| **Average Inventory Value** | $52,194 | $52,626 | **$53,990** | Healthy working capital buffer |
| **Total Orders Placed** | 539 orders | 808 orders | **994 orders** | Responsive, dynamic batch replenishment |

See [docs/ml_experiment.md](docs/ml_experiment.md) and `backend/reports/metrics/inventory_simulation.json` for full metrics breakdown and residual analysis.

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

## 🔄 Operational MLOps Lifecycle, Promotion & Monitoring

MORROW enforces strict separation of concerns across the machine learning lifecycle. Detailed architectural documentation is available in [docs/mlops_lifecycle.md](file:///Users/mahajanpiyush/Desktop/Work/projects/MORROW/docs/mlops_lifecycle.md).

### 1. Repeatable Operational Pipeline
The complete lifecycle from raw transactions to registered production models can be triggered in a single command:
```bash
# Full pipeline with validation, features, candidate training, evaluation, and promotion
python3 backend/ml/pipeline.py

# Lightweight CI smoke test mode
python3 backend/ml/pipeline.py --smoke-test --skip-prepare
```

### 2. Explicit 8-Gate Model Promotion Criteria
Candidate models are evaluated against pre-defined, non-negotiable gates in [params.yaml](file:///Users/mahajanpiyush/Desktop/Work/projects/MORROW/params.yaml) before deployment:
* **GATE_01:** Overall WAPE $\le 0.90$ (Candidate: **0.8321**)
* **GATE_02:** Relative lift over seasonal baseline $\ge +5.0\%$ (Candidate: **+16.36%**)
* **GATE_03:** Explained variance $R^2 \ge +0.05$ (Candidate: **+0.1589**)
* **GATE_04:** High-volume segment WAPE $\le 0.85$ (Candidate: **0.7384**)
* **GATE_05:** Mid-volume segment WAPE $\le 0.95$ (Candidate: **0.8506**)
* **GATE_06:** Low-volume segment WAPE $\le 1.40$ (Candidate: **1.2469**)
* **GATE_07:** Data quality zero critical violations (Candidate: **0 Issues**)
* **GATE_08:** Calibrated 80% prediction interval test coverage $\ge 70.0\%$ (Candidate: **75.8%**)

Approved models are registered in the MLflow Model Registry as `@production`.

### 3. Single-Command Model Rollback Path
If a newly deployed model exhibits anomalies post-deployment, operators can instantly quarantine the model and restore the last approved version:
```bash
# CLI rollback
python3 backend/ml/rollback.py

# API rollback
curl -X POST "http://localhost:8000/api/model/rollback?reason=Observed+latency+spike"
```

### 4. Input Feature Drift & Retraining Philosophy
Feature distributions are continuously audited against baseline validation distributions using the **Population Stability Index (PSI)** across key lag and rolling features:
* **PSI < 0.10:** Stable
* **0.10 <= PSI < 0.25:** Moderate Shift (Warning)
* **PSI >= 0.25:** Significant Drift (Investigation Trigger)

> **Core Philosophy:** Drift is treated strictly as an **investigation trigger**, NOT an automated retraining command. In retail, shifts commonly arise from expected holiday shopping or promotional campaigns without hurting downstream forecast accuracy. Retraining is only initiated if downstream forecast residuals deteriorate concurrently.

### 5. Production Monitoring Endpoints
* `GET /api/monitoring/data-quality` — Missing dates, duplicates, negative values, and $>5\times \text{IQR}$ volume spikes.
* `GET /api/monitoring/drift` — Population Stability Index (PSI) by feature.
* `GET /api/monitoring/performance` — Realized WAPE, MAE, and forecast tracking bias across 7/14/30-day rolling windows.
* `GET /api/monitoring/service` — Request volume, error rate %, and latency percentiles (p50, p95, p99).
* `GET /api/monitoring/alerts` — Actionable alerts with severity, affected SKUs, and recommended actions.
* `GET /api/monitoring/feedback` & `POST /api/monitoring/feedback` — Persistent forecast feedback loop log.

---

## 🚀 Getting Started Locally

### Prerequisites
* **macOS / Linux / Windows WSL2**
* **Python 3.12**
* **Node.js 18+ or 20+**
* **Git**

### One-Command Quickstart
To initialize data, verify dependencies, and launch both backend and frontend servers simultaneously:
```bash
chmod +x ./start.sh
./start.sh
```
Open **`http://localhost:5173`** for the frontend and **`http://localhost:8000/docs`** for interactive OpenAPI documentation.

Detailed configuration and demo cloud architecture options are documented in [docs/deployment_and_usability.md](file:///Users/mahajanpiyush/Desktop/Work/projects/MORROW/docs/deployment_and_usability.md).

---

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
# Run lightweight pipeline smoke test
python3 backend/ml/pipeline.py --smoke-test --skip-prepare
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
