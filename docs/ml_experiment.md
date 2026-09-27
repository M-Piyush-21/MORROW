# Machine Learning Experiment & Evaluation Report — MORROW

## 🎯 1. Experiment Objective

To benchmark a Machine Learning demand forecasting model against a conventional seasonal retail heuristic on transaction data from the **UCI Online Retail** dataset. The goal is to accurately predict multi-step daily SKU demand while preventing target leakage and handling intermittent demand patterns.

---

## 🔬 2. Data Splits (Strict Chronological Ordering)

To emulate realistic production conditions, the 374-day continuous dataset was split chronologically rather than randomly:

* **Training Window:** `2010-12-01` to `2011-08-31` (12,300 observations across 50 top SKUs)
* **Validation Window:** `2011-09-01` to `2011-10-14` (2,200 observations)
* **Held-out Test Window:** `2011-10-15` to `2011-12-09` (2,800 observations)

---

## 📊 3. Models Evaluated

1. **Naive Seasonal Baseline (Lag-7):**
   - Standard retail heuristic: predicts that tomorrow's demand will equal the demand observed on the exact same weekday of the prior week ($t-7$).
2. **Random Forest Regressor (MORROW Production Candidate):**
   - Ensemble of 120 decision trees (`max_depth=14`, `min_samples_split=4`, `random_state=42`).
   - Feature inputs: $t-1, t-7, t-14, t-21, t-28$ lags, rolling averages (7, 14, 28 days shifted by 1), calendar day of week, day of month, month, weekend flag, and unit price.

---

## 📈 4. Measured Evaluation Results (Held-Out Test Set)

> All metrics below were computed directly on the 2,800 test observations spanning `2011-10-15` through `2011-12-09`.

| Metric | Naive Seasonal Baseline (Lag-7) | Random Forest Regressor (MORROW) | Relative Improvement |
|---|---|---|---|
| **Mean Absolute Error (MAE)** | **80.64 units** | **67.45 units** | **+16.4% error reduction** |
| **Root Mean Squared Error (RMSE)** | **241.16 units** | **186.58 units** | **+22.6% error reduction** |
| **Weighted Absolute % Error (WAPE)** | **99.49%** | **83.21%** | **+16.3% accuracy gain** |
| **Coefficient of Determination ($R^2$)** | **-0.405** | **+0.159** | **Significant variance explanation** |
| **Non-Zero MAPE** | **99.5%** | **78.4%** | **+21.1% gain on active sale days** |
| **Training Latency** | ~0.01 sec | ~1.05 sec | Real-time retraining feasible |

### Metric Strategy Note:
- **Zero-Demand Days:** In retail, intermittent zero-sale days cause standard MAPE ($\frac{|y - \hat{y}|}{y}$) to divide by zero. MORROW addresses this by reporting **WAPE** ($\frac{\sum |y - \hat{y}|}{\sum y}$) as the primary business percentage error, and computing non-zero MAPE exclusively on days where actual demand $> 0$.

---

## 🧪 5. MLflow Tracking & Artifacts

All experiment runs, parameters, metrics, and figures were logged to the local SQLite MLflow tracking server (`sqlite:///mlruns.db`):

* **Experiment Name:** `morrow_demand_forecasting`
* **Run ID:** `ac5cd5b6f96c4fc997ea7c6e25aa6c7b` (Random Forest Training)
* **Run ID:** `8c077b6bafcb44d2a07fe6e5b491d636` (Test Set Evaluation)
* **Logged Artifacts:**
  - `backend/models/random_forest_demand.joblib`
  - `backend/reports/figures/actual_vs_predicted.png`
  - `backend/reports/figures/residual_distribution.png`
  - `backend/reports/metrics/evaluation_metrics.json`
  - `backend/reports/metrics/model_comparison.json`

To launch and explore the visual MLflow dashboard:
```bash
.venv/bin/mlflow ui --backend-store-uri sqlite:///mlruns.db --port 5000
```
Then navigate to `http://localhost:5000`.
