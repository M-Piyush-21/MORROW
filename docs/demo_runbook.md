# Presentation & Live Demo Runbook — MORROW

> A structured, 5–7 minute walkthrough guide for showcasing MORROW to stakeholders, instructors, and hiring managers.

---

## ⏱ Demo Timeline (5–7 Minutes)

```text
[0:00 - 1:00] Problem Context & Mission
[1:00 - 2:15] Executive Overview Dashboard
[2:15 - 3:30] Inventory Management & Stock Adjustment
[3:30 - 4:45] AI Demand Forecasting (7/14/30 Days)
[4:45 - 5:45] Restock Recommendations & Dynamic Recalculation
[5:45 - 6:30] MLOps Pipeline & Model Performance (DVC + MLflow)
[6:30 - 7:00] Architecture Wrap-up & Q&A
```

---

## 🎬 Step-by-Step Script & Actions

### 1. Introduction (0:00 - 1:00)
* **Navigate to:** `http://localhost:5173/`
* **Narrative:**
  > "Retailers lose billions annually on two extremes: overstocking capital-draining inventory that perishes or depreciates, and stockouts that forfeit sales and lose customers. **MORROW** is an AI-powered demand intelligence platform built to keep retailers 'a little ahead of demand.' Today I'll demonstrate the working end-to-end system running on real transaction data from the UCI Online Retail dataset."

### 2. Overview Dashboard (1:00 - 2:15)
* **Highlight:**
  - 5 core KPI cards: Total Products, Total Valuation (INR ₹), Items Running Low, Stockout Risk Count, and 7-day predicted volume.
  - The **Sales vs. Forecast** interactive chart: Point out the solid emerald area (historical actual sales) transitioning to the dashed forecast region.
  - Category breakdown and the real-time operational activity log.

### 3. Inventory Workspace (2:15 - 3:30)
* **Navigate to:** Sidebar $\rightarrow$ **Inventory** (`/inventory`)
* **Actions:**
  - Type `23166` or `WHITE` in the search bar. Note how the table filters instantly.
  - Show the **Stock Status badges**: *In Stock*, *Low Stock*, *Critical*, *Out of Stock*.
  - Click **"+ Add Product"** modal: demonstrate input validation and show the instant session update with a Sonner toast notification.
  - Click on a row to open the **Product Detail Drawer (Sheet)**: highlight the 14-day sales trend chart and supplier lead time parameters.

### 4. Demand Forecast Workspace (3:30 - 4:45)
* **Navigate to:** Sidebar $\rightarrow$ **Demand Forecast** (`/forecast`)
* **Actions:**
  - Select product `23166` (MEDIUM CERAMIC TOP STORAGE JAR).
  - Switch the horizon from **7 Days** to **14 Days**, then **30 Days**.
  - Click **"Generate Forecast"**: explain that this is querying our live FastAPI endpoint (`/api/forecast/23166?horizon=14`).
  - Explain the **forecast visual transition**:
    - Recent actuals are displayed on the left.
    - Shaded upper and lower bounds display the confidence interval.
    - Summary cards report Expected Total Demand, Average Daily Forecast, and Model Uncertainty standard deviation.

### 5. Restock Recommendations (4:45 - 5:45)
* **Navigate to:** Sidebar $\rightarrow$ **Restock Recommendations** (`/restock`)
* **Actions:**
  - Filter by **High Priority** to show items nearing critical stockout.
  - Click a product row to reveal the **Calculation Breakdown Drawer**.
  - **The "Magic" Interaction:**
    - Edit **Supplier Lead Time** from `4` to `7` days.
    - Edit **Safety Stock** from `20` to `50` units.
    - Watch the **Reorder Point**, **Recommended Order Quantity**, and **Estimated Stockout Timeline** dynamically recalculate on screen using the transparent formulas!

### 6. Model Performance & MLOps (5:45 - 6:30)
* **Navigate to:** Sidebar $\rightarrow$ **Model Performance** (`/model`)
* **Actions:**
  - Show the model status badge: *Random Forest Regressor v1.0.0 — Registered*.
  - Show the **Model Comparison Table**: Point out the measured held-out test metrics where Random Forest (MAE 67.45) beats the Naive Baseline (MAE 80.64) by 16.4%.
  - Show the **Actual vs. Predicted Validation Chart**.
  - Point to the **MLflow Experiment Runs Table** and click **"Retrain Model"** to demonstrate the modal.

### 7. Settings & Backend Health (6:30 - 7:00)
* **Navigate to:** Sidebar $\rightarrow$ **Settings** (`/settings`)
* **Actions:**
  - Point to the **MLOps & Backend Integration** card showing the green badge: **"FastAPI Live"**.
  - Click **"Test Endpoint"**: show the instant ping confirming that FastAPI, the model, and the dataset are online.
  - Toggle between **Light** and **Dark Mode** to show visual polish.

---

## 🛟 Backup Plan / Offline Demo Mode

If the backend server is stopped during the presentation:
- The frontend will automatically detect the absence of the backend via `fetchWithFallback`.
- The Settings badge will switch to **"Mock Mode (Offline)"**.
- All pages will gracefully fall back to deterministic mock datasets without any UI crashes or white screens!
