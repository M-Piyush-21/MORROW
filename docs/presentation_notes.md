# 10-Slide Presentation Outline — MORROW

> "A little ahead of demand."
> Senior ML Engineering & MLOps Portfolio Presentation

---

## Slide 1: Title & Vision
* **Title:** MORROW — AI Demand Forecasting & Inventory Intelligence
* **Tagline:** *"A little ahead of demand."*
* **Presenter:** Full-Stack Machine Learning & MLOps Engineer
* **Core Value:** Transforming fragmented retail transactions into autonomous forecasting, proactive replenishment, and robust MLOps operations.

---

## Slide 2: The Problem
* **The Retail Dilemma:** Retailers navigate a razor-thin boundary between overstocking (capital lockup, shelf spoilage, discounting) and stockouts (lost revenue, customer churn).
* **Heuristics Fall Short:** Traditional methods rely on static min-max rules or naive same-day-last-week heuristics that fail to capture trend shifts, multi-day autocorrelation, and intermittent demand.
* **The Need:** An end-to-end operational platform combining time-series ML modeling with real-time inventory management.

---

## Slide 3: MORROW Solution & Architecture
* **Integrated Stack:**
  - **Frontend:** Modern, minimalist React 18 + TypeScript + Vite SPA styled with Tailwind CSS tokens and Recharts data visualizations.
  - **Backend:** High-throughput FastAPI asynchronous REST API with Pydantic validation.
  - **ML Engine:** Leakage-free feature engineering and recursive multi-step forecasting.
  - **MLOps:** DVC data & pipeline versioning + MLflow experiment tracking and registry + Docker containerization.

---

## Slide 4: Dataset & Quality Engineering
* **Data Source:** UCI Online Retail Dataset (541,909 records across 4,070 SKUs).
* **Data Integrity Decisions:**
  - 5,268 exact duplicate records eliminated.
  - 10,587 cancellation/return transactions (`C...` invoices, negative quantities) systematically isolated to model true outbound customer demand.
  - 50 top active merchandise SKUs selected (>=90 active transaction days) with continuous daily calendar reindexing.
  - Zero-demand imputation (34.0% zero-demand ratio) handled cleanly.

---

## Slide 5: Leak-Free Feature Engineering
* **Feature Vector (16 Features):**
  - **Lags:** $t-1, t-7, t-14, t-21, t-28$ daily demand.
  - **Rolling Statistics:** 7-day, 14-day, and 28-day rolling averages and standard deviations.
  - **Strict No-Leakage Guarantee:** All rolling aggregates are computed on `quantity.shift(1)` — day $t$ target is never included in features for day $t$.
  - **Calendar Signals:** Day of week, day of month, month of year, weekend binary flag, and unit price.

---

## Slide 6: Model Design & Baseline Comparison
* **Baseline Heuristic:** Naive Seasonal Baseline (Lag-7) — standard retail assumption of weekly recurrence.
* **ML Model:** Random Forest Regressor (120 estimators, `max_depth=14`, `min_samples_split=4`, `random_state=42`).
* **Evaluation Protocol:** Strict chronological holdout split (Train up to 2011-09-01; Validation to 2011-10-15; Test held out 2011-10-15 to 2011-12-09).

---

## Slide 7: Real Measured Evaluation Results
* **Test Set Performance (2,800 Holdout Observations):**
  - **MAE:** Random Forest achieved **67.45 units** vs. Naive Baseline **80.64 units** (**16.4% reduction in prediction error**).
  - **RMSE:** Random Forest achieved **186.58 units** vs. Naive Baseline **241.16 units** (**22.6% reduction in variance**).
  - **WAPE:** Improved from **99.49%** down to **83.21%** (**16.3% business accuracy gain**).
  - **$R^2$ Score:** Shifted from negative explained variance (**-0.405**) to positive (**+0.159**).
* **Validation Artifact:** Actual vs. Predicted curves and residual distributions logged to `backend/reports/figures/`.

---

## Slide 8: The MLOps Foundation
* **DVC (Data Version Control):**
  - 4-stage reproducible DAG (`prepare_data` $\rightarrow$ `build_features` $\rightarrow$ `train` $\rightarrow$ `evaluate`).
  - Single-command pipeline reproduction via `dvc repro`.
* **MLflow Tracking & Registry:**
  - Automated logging of hyperparameters, validation metrics, model artifacts, and evaluation figures into SQLite store.
* **CI/CD Automation:**
  - GitHub Actions workflow running automated Pytest test suites (leakage prevention, formula validation, API contracts) and Vite production builds.

---

## Slide 9: Live Product Demonstration
* **Executive Dashboard:** Live KPI cards, 30-day actual vs 7-day predicted composed demand chart, and low-stock alerts.
* **Dynamic Restock Workspace:** Live adjustments of supplier lead time and safety stock with instant calculation updates:
  $$\text{Reorder Point} = \text{Lead Time Demand} + \text{Safety Stock}$$
  $$\text{Suggested Order Qty} = \max(0, \text{Target Stock Level} - \text{Current Stock})$$
* **Forecast Workspace:** 7, 14, and 30-day recursive demand forecasts with uncertainty bounds.
* **Settings & Health:** Live FastAPI connectivity ping and offline fallback badge.

---

## Slide 10: Limitations, Future Work & Conclusion
* **Data Limitations:** Raw transaction datasets do not log warehouse stock-on-hand or vendor lead times; MORROW combines transactional intelligence with user-configurable operational parameters.
* **Future Horizons:**
  - Hierarchical reconciliation across product categories.
  - Deep learning architectures (Temporal Fusion Transformers, PatchTST).
  - Production deployment to AWS ECS / Google Cloud Run with automated model drift monitoring.
* **Takeaway:** MORROW demonstrates a complete, reproducible, production-grade MLOps system that connects machine learning research directly to retail operational value.
