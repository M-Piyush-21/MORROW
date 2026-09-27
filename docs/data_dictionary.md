# Data Dictionary & Preprocessing Decisions — MORROW

## 📊 1. Raw Dataset Source & Overview

* **Source:** UCI Machine Learning Repository — [Online Retail Dataset](https://archive.ics.uci.edu/dataset/352/online+retail)
* **Author / Donor:** Dr. Daqing Chen, Director of Public Analytics Research Group, London South Bank University
* **Domain:** Transactional retail records between 01/12/2010 and 09/12/2011 for a UK-based, registered non-store online retail business.
* **Original File:** `backend/data/raw/Online Retail.xlsx` (~23 MB)
* **Raw Record Count:** 541,909 transactions across 8 columns.

---

## 📋 2. Raw Schema

| Field Name | Raw Type | Description | Observed Missing | Example Value |
|---|---|---|---|---|
| `InvoiceNo` | `object` | 6-digit integral number uniquely assigned to each transaction. If this code starts with letter 'c', it indicates a cancellation. | 0 | `536365`, `C536379` |
| `StockCode` | `object` | Product/item code uniquely assigned to each distinct item. | 0 | `85123A`, `22197` |
| `Description` | `object` | Product description text. | 1,454 (0.27%) | `WHITE HANGING HEART T-LIGHT HOLDER` |
| `Quantity` | `int64` | The quantities of each product (item) per transaction. Negative values denote returns or adjustments. | 0 | `6`, `-12` |
| `InvoiceDate` | `datetime64` | The day and time when each transaction was generated. | 0 | `2010-12-01 08:26:00` |
| `UnitPrice` | `float64` | Product price per unit in sterling (£). | 0 | `2.55` |
| `CustomerID` | `float64` | 5-digit integral number uniquely assigned to each customer. | 135,080 (24.9%) | `17850.0` |
| `Country` | `object` | The name of the country where each customer resides. | 0 | `United Kingdom` |

---

## 🧹 3. Preprocessing & Cleaning Rules

### Rule 1: Exact Duplicates Removal
* **Action:** Removed 5,268 exact duplicate rows.
* **Rationale:** In transactional e-commerce databases, network retries or batch logging glitches can duplicate rows. Exact duplicate lines with identical timestamps and invoices skew demand calculations.

### Rule 2: Cancellation & Return Policy
* **Action:** 10,587 records starting with invoice code `C` or having `Quantity <= 0` were flagged and excluded from the outbound demand model.
* **Rationale:** Demand forecasting in retail inventory planning models **customer purchasing intent and outbound volume requirements**. A return logged 3 months after purchase does not represent negative customer demand on the return date; treating it as negative demand on day $t$ distorts sales velocity and creates negative target artifacts.

### Rule 3: Non-Product Administrative Filtering
* **Action:** Excluded non-merchandise system codes: `POST` (Postage), `D` (Discount), `M` (Manual), `BANK CHARGES`, `AMAZONFEE`, `CRUK`, `DOT`, `S`, `B`.
* **Rationale:** These represent administrative fees and freight adjustments, not physical SKU inventory.

### Rule 4: Clean Description Mapping
* **Action:** Each distinct `StockCode` was mapped to its modal (most frequent) non-null description to resolve minor spelling variations across invoices.

### Rule 5: Daily Aggregation & Zero-Demand Imputation
* **Action:**
  - Grouped transactions by `(StockCode, Date)`.
  - Filtered top 50 active SKUs with at least 90 days of transactions.
  - Reindexed to a continuous 374-day calendar (`2010-12-01` to `2011-12-09`).
  - Days with no transactions were imputed with `quantity = 0` (zero demand).
* **Observed Zero-Demand Ratio:** 34.0% of daily observations across the modeled SKUs had 0 units sold (intermittent demand pattern).

---

## 🧬 4. Engineered Feature Dictionary

| Feature Name | Type | Description | Leakage Prevention Strategy |
|---|---|---|---|
| `quantity` (Target) | `int64` | Outbound daily units demanded on day $t$. | Ground truth target $y$. |
| `lag_1` | `float64` | Actual units sold on day $t-1$. | Strictly uses prior day value. |
| `lag_7` | `float64` | Actual units sold on day $t-7$ (same weekday prior week). | Uses value 7 days prior. |
| `lag_14` | `float64` | Actual units sold on day $t-14$. | Uses value 14 days prior. |
| `lag_21` | `float64` | Actual units sold on day $t-21$. | Uses value 21 days prior. |
| `lag_28` | `float64` | Actual units sold on day $t-28$. | Uses value 28 days prior. |
| `rolling_mean_7` | `float64` | 7-day rolling average demand. | Computed on `quantity.shift(1)` (days $t-7$ to $t-1$). Never includes day $t$. |
| `rolling_std_7` | `float64` | 7-day rolling standard deviation. | Computed on `quantity.shift(1)`. |
| `rolling_mean_14` | `float64` | 14-day rolling average demand. | Computed on `quantity.shift(1)`. |
| `rolling_std_14` | `float64` | 14-day rolling standard deviation. | Computed on `quantity.shift(1)`. |
| `rolling_mean_28` | `float64` | 28-day rolling average demand. | Computed on `quantity.shift(1)`. |
| `rolling_std_28` | `float64` | 28-day rolling standard deviation. | Computed on `quantity.shift(1)`. |
| `day_of_week` | `int64` | Day of week integer (0 = Monday, 6 = Sunday). | Deterministic calendar attribute. |
| `day_of_month` | `int64` | Day of month (1–31). | Deterministic calendar attribute. |
| `month` | `int64` | Month of year (1–12). | Deterministic calendar attribute. |
| `is_weekend` | `int64` | Binary indicator (1 if Saturday/Sunday, else 0). | Deterministic calendar attribute. |
| `unit_price` | `float64` | Moving average unit selling price. | Carried forward from historical sales. |

---

## ⚠️ 5. Dataset Limitations & Realistic Assumptions

1. **Absence of On-Hand Stock:** The UCI dataset contains historical customer transactions, but does **not** log inventory warehouse snapshots, shelf counts, or stockouts. Current stock values displayed in the demo are calculated from safe inventory run-rates.
2. **Absence of Supplier Lead Times:** Supplier replenishment lead times are not recorded in transaction invoices. In MORROW, supplier lead times are configured via verified vendor profiles (2–7 days) and remain fully editable by the operator in the Restock workspace.
