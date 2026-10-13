# MORROW — Scaled AI Associate Consultant Interview Guide

> **Target Role:** Associate Consultant — Scaled AI / Applied Machine Learning  
> **Core Theme:** Evolving machine learning from technical accuracy metrics into measurable, de-risked business decisions under explicit assumptions.

---

## 1. The 60-Second Elevator Pitch
> *"MORROW is a retail demand forecasting and inventory decision-support solution that connects time-series ML modeling directly to inventory replenishment decisions. Rather than just tracking loss functions like RMSE or WAPE, MORROW translates forecast distributions into actionable order quantities under practical constraints—such as lead times, safety stocks, minimum order quantities (MOQ), and pack sizes.*  
> *Crucially, we pair the model with an automated 8-gate model promotion framework, an empirical inventory backtest simulation comparing decisions against heuristic baselines, an instant rollback mechanism, and a production monitoring loop that treats feature drift as an investigation trigger rather than blindly retraining.*  
> *Throughout the project, all cost metrics are labeled as scenario assumptions rather than observed accounting facts, separating historical proof from simulated business impact."*

---

## 2. Core Narrative Architecture (The 5 Interview Pillars)

```mermaid
graph LR
    P1[1. Business Problem & Decision Translation] --> P2[2. Reliable Chronological Evaluation]
    P2 --> P3[3. Inventory Backtest & Economics]
    P3 --> P4[4. Operational Lifecycle & Quality Gates]
    P4 --> P5[5. Production Monitoring & Feedback]
```

### Pillar 1: Translating the Business Problem into an Operational Decision
* **The Retail Dilemma:** Retailers navigate a trade-off between **stockouts** (lost revenue, customer churn) and **excess inventory** (working capital tie-up, holding costs, shelf expiration).
* **The Decision Equation:**
  $$\text{Inventory Position (IP)} = \text{Current On-Hand Stock} + \text{In-Transit Stock}$$
  $$\text{Reorder Point (ROP)} = (d \times L) + SS$$
  $$\text{Trigger Condition: Order placed when } IP \le ROP$$
  $$\text{Base Order} = \max(0, S_{\text{target}} - IP)$$
  $$\text{Constrained Order} = \text{Clamp}(\text{Round}(\max(\text{Base Order}, \text{MOQ}), \text{Pack Size}), \text{Max Capacity})$$
* **Decoupled Architecture:** Forecast demand generation is separated from replenishment policy calculation. A change in forecast model does not break business constraint logic, and the replenishment engine can be audited independently with synthetic inputs.

---

### Pillar 2: Rigorous, Leak-Free Model Evaluation
* **Preventing Data Leakage:**
  - Chronological holdout splits (Train: transactions up to 2011-09-01; Validation: 2011-09-01 to 2011-10-15; Test: 2011-10-15 to 2011-12-09).
  - All rolling statistics ($7, 14, 28$ days) are computed on `quantity.shift(1)`. The day $t$ demand is strictly excluded from day $t$ features.
* **Segment-Level Granularity:**
  - Aggregate metrics hide failure modes. Low-volume intermittent SKUs exhibit high variance where MAPE divides by zero or near-zero.
  - Evaluated separately:
    - **High-Volume SKUs (Top 20%):** Model achieves **73.8% WAPE** vs. **86.1% Baseline**.
    - **Mid-Volume SKUs:** Model achieves **85.1% WAPE** vs. **98.2% Baseline**.
    - **Low-Volume Intermittent SKUs:** Evaluated with WAPE and zero-demand frequency (21.0% zero-demand days).
* **Multi-Horizon Evaluations:**
  - Rather than assuming 1-day metrics generalize to 30 days:
    - **7-day horizon:** 79.4% WAPE (+17.2% lift over baseline)
    - **14-day horizon:** 82.1% WAPE (+16.5% lift over baseline)
    - **30-day horizon:** 86.8% WAPE (+14.8% lift over baseline)
* **Empirical Prediction Interval Calibration:**
  - Calibrated conformal residual bounds: 80% nominal confidence interval achieved **76.7% empirical coverage** on held-out test data.

---

### Pillar 3: Empirical Inventory Backtest & Policy Trade-offs
* **Simulation Protocol:**
  - Evaluated on 2,800 out-of-time test SKU-days.
  - Compares MORROW dynamic reorder policy against a **Fixed Weekly Reorder Baseline**.
* **Measured Outcomes:**
  - **Service Level (Fill Rate):** Increased from **78.2%** to **88.6%** (**+10.4% fill rate lift**).
  - **Stockout Days:** Reduced by **47.6%** (from 324 days down to 170 days).
  - **Total Simulated Operational Cost:** Saved **14.2%** under benchmark assumptions.
* **Conservative vs. Balanced vs. Lean Trade-offs:**
  - **Conservative (98% service level, 28d supply):** Near-zero stockout (<2%), but ties up working capital.
  - **Balanced (95% service level, 18d supply):** Optimal risk-capital balance.
  - **Lean (90% service level, 10d supply):** Lowest holding cost, but vulnerable to supplier shipping delays.
* **Honest Consultant Stance:**
  > *"Cost figures ($40/PO, 20% holding rate) are clearly labeled as configurable scenario inputs—not audited financial facts. A simulation provides directional proof of decision quality, but is not equivalent to a live store trial."*

---

### Pillar 4: Operational MLOps & The 8 Promotion Gates
* **Automated Repeatable Pipeline:** Single command execution (`python3 backend/ml/pipeline.py`).
* **Pre-Defined, Justified Promotion Gates (No P-Hacking):**
  1. Primary WAPE ceiling $\le 90.0\%$ (Candidate: **83.2%**)
  2. Baseline relative WAPE lift $\ge 5.0\%$ (Candidate: **+16.4%**)
  3. Explanatory power $R^2 \ge 0.05$ (Candidate: **+0.157**)
  4. RMSE ceiling $\le 200$ units (Candidate: **186.8**)
  5. High-volume segment guardrail $\le 85.0\%$ (Candidate: **73.8%**)
  6. Mid-volume segment guardrail $\le 95.0\%$ (Candidate: **85.1%**)
  7. 80% prediction interval empirical coverage $\ge 70.0\%$ (Candidate: **76.7%**)
  8. Data quality zero critical violations (Candidate: **0 Issues**)
* **MLflow Governance:** Approved versions registered as `@production`.
* **Single-Command Rollback (`python3 backend/ml/rollback.py`):** Automatically isolates faulty models in `backend/models/quarantined/`, verifies archive integrity, and restores the last approved version.

---

### Pillar 5: Production Monitoring & Feedback Loop
* **The 4 Monitoring Pillars:**
  1. **Data Quality:** Missing calendar dates, duplicate transactions, negative quantities, and volume spikes (> 5x IQR).
  2. **Feature Drift (PSI):** Tracks Population Stability Index on `lag_1`, `lag_7`, `rolling_mean_7`, `unit_price`.
  3. **Realized Performance:** 7/14/30-day realized residuals and tracking signals once actual demand arrives.
  4. **Service Health:** Request percentiles (p50, p95, p99), error rates, model load health.
* **The Non-Automatic-Retraining Principle:**
  > *"Feature drift does NOT automatically trigger retraining. In retail, seasonal holidays or marketing promos naturally shift feature distributions without breaking model relationships. Drift is an investigation trigger; we validate realized residuals before deciding whether to retrain."*
* **Persistent Feedback Log:** Append-only JSONL log linking predictions, recommendations, assumed stock, and realized stockouts.

---

## 3. High-Probability Interview Questions & Star Answers

### Q1: "How did you measure the business value of this model?"
**Answer:**
> *"Instead of relying solely on statistical loss metrics like RMSE, we built a discrete-event inventory simulation across the held-out test split. We compared MORROW's dynamic reorder policy against a standard weekly baseline reorder rule.*  
> *We tracked decision-level operational outcomes: stockout days dropped from 324 to 170 (-47.6%), while customer fill rate increased from 78.2% to 88.6%. We also evaluated holding costs under configurable scenario rates, taking care to label those costs as scenario assumptions rather than observed accounting facts."*

### Q2: "How do you handle low-volume or intermittent demand items?"
**Answer:**
> *"In retail, 20-30% of SKU days have zero demand. If you compute MAPE on these, you divide by zero or inflate errors artificially.*  
> *In MORROW, we did three things: first, we adopted Weighted Absolute Percentage Error (WAPE), which weights errors by total volume; second, we segmented the catalog into volume tiers (High, Mid, Low) and evaluated each separately; third, we added Croston-style intermittent indicators and conformal prediction intervals so inventory planners see the uncertainty spread rather than a misleading single-point forecast."*

### Q3: "What happens when your model drifts in production?"
**Answer:**
> *"We monitor Population Stability Index (PSI) on core demand features like 7-day rolling averages and price. However, we deliberately chose not to automate retraining on drift triggers alone.*  
> *In retail, a Black Friday sale or holiday surge naturally shifts input distributions. If you automatically retrain on an unverified shift, you risk fitting noise or degrading the model. Instead, drift triggers an alert and initiates residual validation. Only when realized performance deteriorates or data quality checks pass do we initiate a controlled candidate pipeline run through our 8 promotion gates."*

### Q4: "How does your solution fit into an enterprise IT landscape?"
**Answer:**
> *"We designed the system with clean architectural boundaries:*  
> *The forecasting model runs as a containerized FastAPI service. The replenishment policy is decoupled, allowing procurement rules like MOQs, pack sizes, and supplier order cycles to be evaluated independently.*  
> *Models are versioned and tagged `@production` in the MLflow Model Registry, and we provide an instant rollback path to quarantined previous releases.*  
> *Finally, our demo environment clearly distinguishes between historical transaction records and synthetic on-hand inventory inputs so clients never mistake simulation parameters for physical warehouse WMS feeds."*

---

## 4. What NOT to Do (Anti-Patterns to Avoid)
1. **Never claim unverified real-world dollar savings:** Say *"Our simulation showed a 14.2% cost reduction under specified holding rate assumptions"* rather than *"We saved the retailer $500,000"*.
2. **Never claim synthetic inventory is real WMS data:** Be explicit that transactional demand is from UCI Online Retail, while on-hand stock and lead times are scenario parameters.
3. **Never equate technology stack with production readiness:** Having Docker, FastAPI, and MLflow is necessary engineering hygiene, but production readiness comes from quality gates, monitoring, rollbacks, and data contracts.
4. **Never claim drift equals automatic retraining:** Explain why drift is an investigation trigger.
5. **Never tune promotion thresholds on test results:** Emphasize that the 8 promotion gates were defined in `params.yaml` prior to candidate testing to avoid p-hacking.
