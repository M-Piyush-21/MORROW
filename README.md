# StockSense — AI Demand Forecasting & Inventory Intelligence

> A modern, responsive frontend prototype for AI-powered retail demand forecasting, inventory optimization, and automated replenishment.

---

## 🌟 Overview

**StockSense** is an enterprise-grade demand intelligence and inventory management SaaS frontend built for small-to-medium retail enterprises (SMEs) and modern grocers/kirana stores. 

It demonstrates how operational inventory workflows connect with Machine Learning demand forecasting models, automated replenishment calculations, and MLOps monitoring pipelines.

> **Important Note:** All current forecasts, metrics, and replenishment recommendations are generated from deterministic mock data and simulated API endpoints. Real ML models (Random Forest, Gradient Boosting, XGBoost), FastAPI service, MLflow tracking, DVC data pipelines, and Dockerized deployments will be connected in subsequent phases.

---

## 🚀 Key Features & Pages

| Page | Route | Description |
|---|---|---|
| **Overview Dashboard** | `/` | Executive inventory KPIs, 30-day historical sales vs. 7-day predicted demand composed chart, top-selling products, critical low-stock alerts, restock previews, category distribution breakdown, and real-time operational activity log. |
| **Inventory Management** | `/inventory` | Complete searchable SKU catalog with multi-facet filtering (category, stock status, supplier), column sorting, pagination, stock status badges (In Stock, Low Stock, Critical, Out of Stock), modal for adding new products, modal for rapid stock adjustments, and a comprehensive Product Detail Drawer with 30-day sales history chart and supplier metadata. |
| **Demand Forecasting** | `/forecast` | Dedicated SKU forecast workspace supporting 7, 14, and 30-day prediction horizons, visual distinction between actual and forecasted demand with confidence intervals (shaded regions), summary cards for expected demand and forecast uncertainty, tabular daily breakdown, and a simulated "Generate Forecast" action. |
| **Restock Recommendations** | `/restock` | AI-assisted purchase order recommendations utilizing transparent formulas (`Reorder Point = Demand During Lead Time + Safety Stock` and `Suggested Order Quantity = max(0, Target Stock Level - Current Stock)`). Interactive side panel allows editing supplier lead time and safety stock on-the-fly with instant recalculation and visual stockout timeline. |
| **Historical Analytics** | `/analytics` | Deep operational performance trends including daily/weekly/monthly revenue breakdowns, category volume distributions, top-performing SKUs by turnover, historical stockout event tracking, and sales vs. forecast variance. |
| **Model Performance & MLOps** | `/model` | Machine learning model monitoring dashboard featuring current model status (Registered/Staging/Archived), MAE/RMSE/MAPE metric cards, comparison table against Naive Baseline and Random Forest models, actual vs. predicted validation charts, MLflow experiment run logs, model version registry, and retraining modal. |
| **Settings & Preferences** | `/settings` | Business identity configuration, currency selection (INR ₹ default, USD, EUR, GBP), timezone and date formats, automated threshold alert toggles, default forecast horizon, light/dark appearance toggle, and FastAPI endpoint connection tester with offline demo detection. |

---

## 🛠 Tech Stack

* **Framework:** React 18 with TypeScript & Vite
* **Styling:** Tailwind CSS with custom HSL design tokens
* **Design Aesthetic:** Minimalist SaaS inspired by Linear, Stripe, and Vercel
* **Components:** Custom accessible UI components built on Radix UI primitives (`@radix-ui/*`)
* **Charts & Visualizations:** Recharts for Composed, Area, Bar, Line, and Pie charts
* **Icons:** Lucide React
* **Routing:** React Router DOM v6
* **State Management:** React Context (`AppContext`) with live session state persistence
* **Notifications:** Sonner rich toast notifications
* **Mock Service Layer:** Asynchronous API service layer (`src/services/api.ts` & `src/services/mockApi.ts`) structured for plug-and-play FastAPI integration.

---

## 📦 Project Structure

```text
src/
├── components/
│   ├── dashboard/          # KPI cards, charts, and overview widgets
│   ├── layout/             # Persistent Sidebar, TopNav, and shell Layout
│   ├── shared/             # Status badges, loading skeletons
│   └── ui/                 # Accessible UI components (Dialog, Sheet, Table, etc.)
├── context/
│   └── AppContext.tsx      # Session state (products, settings, notifications, theme)
├── data/
│   └── mockData.ts         # Deterministic mock catalog, sales history, and metrics
├── pages/
│   ├── DashboardPage.tsx
│   ├── InventoryPage.tsx
│   ├── DemandForecastPage.tsx
│   ├── RestockRecommendationsPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── ModelPerformancePage.tsx
│   └── SettingsPage.tsx
├── services/
│   ├── api.ts              # Centralized base URL configuration for FastAPI
│   └── mockApi.ts          # Async API service functions returning typed responses
├── types/
│   └── index.ts            # Domain TypeScript interfaces and types
└── utils/
    ├── calculations.ts     # Reorder point, safety stock, and days-to-stockout formulas
    └── format.ts           # Currency (INR Lakhs/Crores), dates, relative time formatters
```

---

## 🏃 Setup & Running Locally

### Prerequisites

* Node.js 18+ or 20+
* npm or pnpm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

### Production Build

To test the production build:

```bash
npm run build
npm run preview
```

---

## 🔌 Future FastAPI & MLOps Integration

The frontend is architected specifically to decouple UI components from data retrieval:

1. **Centralized Configuration:** `src/services/api.ts` exposes `API_BASE_URL` reading `import.meta.env.VITE_API_BASE_URL`.
2. **Typed Contracts:** `src/services/mockApi.ts` mirrors the endpoints intended for the FastAPI backend:
   * `GET /api/dashboard/summary`
   * `GET /api/products` & `POST /api/products`
   * `GET /api/forecast/{productId}?horizon={days}`
   * `GET /api/recommendations/restock`
   * `GET /api/model/metrics` & `GET /api/model/experiments`
3. To switch from mock mode to live backend:
   Create a `.env` file in the root:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
   The service layer will automatically switch from mock latency promises to real `fetch` HTTP requests.
