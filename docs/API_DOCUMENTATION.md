# 🌾 REST API Documentation — Intelligent Pest Outbreak Prediction & Early Warning Framework

Version: `2.0.0`  
Protocol: `HTTP/1.1 REST + JSON`  
Interactive Swagger UI: `http://localhost:8000/docs`  
ReDoc Reference: `http://localhost:8000/redoc`  
Interactive Dashboard: `http://localhost:8000/dashboard`

---

## 📌 Base URL & Conventions

- **Local Base URL:** `http://localhost:8000`
- **Standard HTTP Methods:**
  - `GET`: Read resource or query collections
  - `POST`: Create resource or execute non-idempotent computational action
  - `PUT`: Update existing resource
  - `DELETE`: Remove resource
- **Content-Type:** `application/json` (except `/dashboard` which returns `text/html; charset=utf-8`)
- **Error Responses:** Standard JSON `{ "detail": "Description of error" }` with RFC 7807 compliant HTTP status codes.

---

## 🚀 API Endpoint Index

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root API metadata and system status |
| `GET` | `/health` | System health check (model, preprocessor, DB) |
| `GET` | `/dashboard` | Interactive Web Dashboard (Leaflet + Weather + Inference + Alerts) |
| `GET` | `/api/stations` | All 11 registered agricultural surveillance stations |
| `GET` | `/api/station/{code}/summary` | Micro-climatic summary & risk index for a given station |
| `GET` | `/api/pests` | Monitored pest species, base temperatures & thresholds |
| `GET` | `/api/v1/weather/live/{location}` | Live Open-Meteo meteorological telemetry with fallback |
| `POST` | `/api/evaluate` | Run bio-climatic feature extraction and ML risk inference |
| `POST` | `/api/predict` | Alias for `/api/evaluate` for backwards compatibility |
| `GET` | `/api/observations` | List field scouting observations with crop/pest filters |
| `POST` | `/api/observations` | Record new in-field scouting telemetry |
| `GET` | `/api/observations/{id}` | Retrieve specific scouting observation |
| `PUT` | `/api/observations/{id}` | Update scouting observation details |
| `GET` | `/api/alerts` | Query early-warning alert logs with status/severity filters |
| `POST` | `/api/alerts` | Create and register a new alert |
| `POST` | `/api/alerts/{id}/ack` | Acknowledge an alert (transitions `PENDING` -> `ACKNOWLEDGED`) |
| `POST` | `/api/alerts/{id}/resolve` | Resolve an alert (transitions to `RESOLVED` with action notes) |
| `POST` | `/api/v1/alerts/dispatch` | Dispatch SMS/Email notifications for critical risk levels |
| `GET` | `/api/risk/history` | Historical risk evaluation trend data |
| `GET` | `/api/models/comparison` | ML benchmark metrics (Accuracy, ROC-AUC, PR-AUC, F1) |
| `GET` | `/api/v1/audit/predictions` | Audit log of all executed ML predictions |

---

## 📖 Detailed Endpoint Specifications

### 1. System Health & Metadata

#### `GET /health`
Returns the operational status of all subsystem dependencies.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "preprocessor_loaded": true,
  "database_connected": true,
  "active_model": "Random Forest (Optimized)",
  "version": "2.0.0"
}
```

---

### 2. Live Weather & Agro-Climatic Stations

#### `GET /api/stations`
Lists the 11 national ICAR/TNAU agro-climatic stations with geographic coordinates.

**Response `200 OK`**:
```json
[
  {
    "code": "CUTTACK",
    "name": "NRRI Cuttack",
    "state": "Odisha",
    "lat": 20.4625,
    "lon": 85.8830,
    "primary_crops": ["Rice"]
  },
  {
    "code": "NAGPUR",
    "name": "CICR Nagpur",
    "state": "Maharashtra",
    "lat": 21.1458,
    "lon": 79.0882,
    "primary_crops": ["Cotton"]
  }
]
```

#### `GET /api/v1/weather/live/{location}`
Retrieves real-time weather from Open-Meteo or regional historical fallback.

**Path Parameters:**
- `location` (string): Station code (e.g., `CUTTACK`, `NAGPUR`, `MARUTERU`, `LAM`, `AKOLA`, `LUDHIANA`)

**Response `200 OK`**:
```json
{
  "location": "CUTTACK",
  "temp_max": 32.4,
  "temp_min": 24.8,
  "rh_morning": 88.0,
  "rh_evening": 68.0,
  "rainfall": 12.5,
  "wind_speed": 4.2,
  "sunshine_hours": 7.1,
  "evaporation": 3.8,
  "source": "Open-Meteo Live API",
  "timestamp": "2026-10-22T06:30:00Z"
}
```

---

### 3. Risk Inference & Agronomic Advisory

#### `POST /api/evaluate`
Extracts agronomic bio-climatic features (GDD, VPD, diurnal swing, RH delta) and generates model outbreak inference with SHAP explanations.

**Request Body (`PredictRequest`):**
```json
{
  "crop": "Rice",
  "pest": "Brown Planthopper",
  "smw": 38,
  "location": "CUTTACK",
  "scout_population": 8.5,
  "weather": {
    "temp_max": 33.0,
    "temp_min": 25.5,
    "rh_morning": 94.0,
    "rh_evening": 78.0,
    "rainfall": 35.0,
    "wind_speed": 3.8,
    "sunshine_hours": 5.5,
    "evaporation": 4.1
  }
}
```

**Response `200 OK` (`PredictResponse`):**
```json
{
  "risk_score": 0.9412,
  "risk_level": "CRITICAL",
  "is_warning": true,
  "gdd_accumulated": 17.25,
  "rh_differential": 16.0,
  "top_factors": [
    {
      "feature": "Outbreak Current",
      "impact": "Elevating Risk",
      "description": "Signal: 1.12 (SHAP attribution weight: 0.344)"
    },
    {
      "feature": "Field Scout Population vs ETL",
      "impact": "Elevating Risk",
      "description": "Signal: 0.70 (SHAP attribution weight: 0.207)"
    }
  ],
  "advisory": "Status: CRITICAL. Field population exceeds economic threshold level (ETL 5.0). Immediate IPM chemical intervention recommended (e.g. Triflumezopyrim 10% SC @ 94 ml/acre). Form drainage channels to reduce canopy humidity.",
  "model_version": "v2.0-ml-random-forest"
}
```

---

### 4. Field Scouting Observations CRUD

#### `GET /api/observations`
Query historical and contemporary scouting logs.

**Query Parameters:**
- `crop` (string, optional): Filter by crop (`Rice`, `Cotton`, etc.)
- `pest` (string, optional): Filter by pest species
- `severity` (string, optional): Filter by severity (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`)
- `limit` (integer, default `50`): Maximum results to return

**Response `200 OK`**:
```json
[
  {
    "id": 1,
    "station_code": "CUTTACK",
    "crop_name": "Rice",
    "pest_name": "Brown Planthopper",
    "observation_date": "2026-10-20",
    "smw": 42,
    "trap_catch": 142.0,
    "field_scout_population": 9.2,
    "temp_max": 32.5,
    "temp_min": 24.8,
    "rh_morning": 92.0,
    "rh_evening": 75.0,
    "rainfall": 18.0,
    "severity_level": "CRITICAL",
    "notes": "Hopper burn symptoms visible in low-lying plots",
    "created_at": "2026-10-20T08:15:00Z"
  }
]
```

#### `POST /api/observations`
Submit a new field scouting report.

**Request Body (`ObservationCreate`):**
```json
{
  "station_code": "MARUTERU",
  "crop_name": "Rice",
  "pest_name": "Yellow Stem Borer",
  "observation_date": "2026-10-22",
  "smw": 42,
  "trap_catch": 45.0,
  "field_scout_population": 3.2,
  "temp_max": 31.0,
  "temp_min": 23.5,
  "rh_morning": 89.0,
  "rh_evening": 70.0,
  "rainfall": 5.0,
  "severity_level": "MODERATE",
  "notes": "Dead heart symptoms observed in 3% of tillers."
}
```
**Response `201 Created`**: Returns created observation object with auto-generated `id`.

---

### 5. Early Warning Alert Lifecycle Management

#### `GET /api/alerts`
Retrieves generated early warning notifications.

**Query Parameters:**
- `status` (string, optional): `PENDING`, `ACKNOWLEDGED`, `RESOLVED`
- `severity` (string, optional): `LOW`, `MODERATE`, `HIGH`, `CRITICAL`
- `limit` (integer, default `50`)

#### `POST /api/alerts/{id}/ack`
Acknowledge an alert to verify an officer is taking charge.
**Response `200 OK`**:
```json
{
  "status": "acknowledged",
  "alert_id": 1,
  "acknowledged_at": "2026-10-22T06:45:00Z"
}
```

#### `POST /api/alerts/{id}/resolve`
Resolve an alert with field action outcome notes.
**Request Body:**
```json
{
  "resolution_notes": "Field scouting team applied Neem seed kernel extract (NSKE 5%) and drained standing water. Population reduced below ETL."
}
```
**Response `200 OK`**:
```json
{
  "status": "resolved",
  "alert_id": 1,
  "resolved_at": "2026-10-22T07:15:00Z"
}
```

---

### 6. Model Benchmarks & Historical Explainability

#### `GET /api/models/comparison`
Returns empirical validation performance metrics across candidate architectures evaluated on the ICAR holdout dataset.

**Response `200 OK`**:
```json
{
  "champion": "Random Forest",
  "evaluation_metric": "ROC-AUC",
  "models": [
    {
      "model_name": "Random Forest",
      "accuracy": 0.9859,
      "roc_auc": 0.9998,
      "pr_auc": 0.9994,
      "f1_score": 0.9859,
      "status": "Production Champion"
    },
    {
      "model_name": "LightGBM",
      "accuracy": 0.9851,
      "roc_auc": 0.9997,
      "pr_auc": 0.9993,
      "f1_score": 0.9851,
      "status": "Candidate"
    },
    {
      "model_name": "Logistic Regression",
      "accuracy": 0.8407,
      "roc_auc": 0.9080,
      "pr_auc": 0.8932,
      "f1_score": 0.8407,
      "status": "Baseline"
    }
  ],
  "static_assets": {
    "shap_summary": "/artifacts/models/shap_summary.png",
    "confusion_matrix": "/artifacts/models/confusion_matrix.png",
    "roc_curve": "/artifacts/models/roc_curve.png"
  }
}
```
