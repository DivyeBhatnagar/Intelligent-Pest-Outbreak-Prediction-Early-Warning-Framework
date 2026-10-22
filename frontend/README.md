# 🌾 Intelligent Pest Outbreak Prediction & Early Warning System — React Frontend

A production-grade, responsive React dashboard built with **TypeScript**, **Tailwind CSS**, **Recharts**, and **React Leaflet**.

Designed for agricultural extension officers, researchers, and agronomists to perform real-time bio-climatic pest surveillance, evaluate machine learning outbreak risks, record field scouting observations, manage early-warning alert lifecycles, and audit model explainability factors.

---

## ⚡ Quickstart: Running Frontend & Backend

### 1. Start the FastAPI Backend Server
In the root directory of the repository:
```bash
# Ensure Python virtual environment is active
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Start the FastAPI ASGI server on port 8000
uvicorn api.main:app --reload --port 8000
```
- API Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Original HTML Dashboard (untouched): [http://localhost:8000/dashboard](http://localhost:8000/dashboard)

---

### 2. Start the React Frontend Development Server
In a separate terminal, navigate into the `frontend/` directory:
```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your web browser.
- The React application is pre-configured with a Vite proxy to route all `/api`, `/artifacts`, and `/health` requests to `http://localhost:8000`.

---

## 🏗️ Architecture & Component Hierarchy

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Header.tsx              # System badges, live clock, alert indicators
│   │   ├── Navigation.tsx          # 7-tab navigation bar with notification badges
│   │   ├── common/
│   │   │   └── StationMap.tsx      # React-Leaflet 11-station interactive map
│   │   └── tabs/
│   │       ├── OverviewTab.tsx     # KPI cards, real-time prediction form, SHAP factors
│   │       ├── RiskMapTab.tsx      # Full-page Leaflet risk map, search & station inspector
│   │       ├── ObservationsTab.tsx # Field scouting observation CRUD table & modal
│   │       ├── RiskHistoryTab.tsx  # Recharts temporal risk trajectories & distributions
│   │       ├── AlertsTab.tsx       # Early-warning alert center, ack/resolve workflows
│   │       ├── ModelPerformanceTab.tsx # Multi-model benchmarks & static XAI plots
│   │       └── SystemHealthTab.tsx # Subsystem diagnostics & runtime telemetry
│   │
│   ├── constants/
│   │   └── agroData.ts             # 11 ICAR stations, pests by crop, color palettes
│   ├── services/
│   │   └── api.ts                  # Typed client service for FastAPI endpoints
│   ├── types/
│   │   └── dashboard.ts            # TypeScript interfaces for predictions, alerts, etc.
│   ├── App.tsx                     # Main layout & URL-synchronized tab state
│   ├── main.tsx                    # React 19 application root
│   └── index.css                   # Tailwind directives & dark glassmorphic tokens
│
├── vite.config.ts                  # Reverse proxy configuration to port 8000
├── tailwind.config.js              # Curated dark palette, fonts & glow shadows
└── package.json
```

---

## 🌟 Core Features & Modules

1. **Overview & Bio-Climatic Inference:**
   - 1-Click **"Auto-Fetch Weather"** powered by live Open-Meteo meteorological telemetry.
   - Calculates **Growing Degree-Days (GDD)**, **Vapor Pressure Deficit (VPD)**, and diurnal swings.
   - Outputs calibrated outbreak probability, risk severity badge (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), and TreeSHAP attribution factor waterfalls.
2. **National Station Network (Leaflet Map):**
   - Covers 11 major ICAR research stations across India's primary agro-ecological zones.
   - Color-coded circular markers displaying live risk levels, primary crops, and micro-climate readings.
3. **Field Scouting Observations (CRUD):**
   - Filter scouting entries by crop, station, and severity.
   - Modal form for field officers to log new trap catch records directly to the backend database.
4. **Early Warning Alert Lifecycle:**
   - Status tracking (`PENDING` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`).
   - Acknowledge alerts and input field remediation action notes upon resolution.
   - Form to dispatch multi-channel SMS (Twilio) and HTML Email advisories.
5. **Model Benchmarks & Explainability:**
   - Recharts comparative performance bar charts across candidate architectures (Random Forest, LightGBM, XGBoost, Decision Tree, Logistic Regression, Quad-Ensemble).
   - High-resolution visual artifacts for **TreeSHAP Summary Plots**, **Confusion Matrices**, and **ROC-AUC Curves**.
6. **System Health & Telemetry:**
   - Real-time status checks for FastAPI backend, ML artifacts, SQLite database, and Open-Meteo weather client.

---

## 📦 Production Build
To create an optimized production bundle:
```bash
npm run build
```
The output will be created in `frontend/dist/`.
