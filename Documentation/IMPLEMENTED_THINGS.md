# 🌾 Implemented Things — Intelligent Pest Outbreak Prediction & Early Warning Framework

This document tracks all foundational code, data engineering pipelines, configurations, and backend API components implemented for the project.

---

## 📌 Table of Contents

- [1. Overview of Implementation](#1-overview-of-implementation)
- [2. Directory & Module Architecture](#2-directory--module-architecture)
- [3. Environment & Dependencies (`requirements.txt`)](#3-environment--dependencies-requirementstxt)
- [4. Central Configuration (`src/config.py`)](#4-central-configuration-srcconfigpy)
- [5. Data Engineering Pipeline (`src/data/`)](#5-data-engineering-pipeline-srcdata)
  - [5.1 Multi-Source Dataset Loader (`loader.py`)](#51-multi-source-dataset-loader-loaderpy)
  - [5.2 Preprocessing & Outlier Cleaning (`preprocessor.py`)](#52-preprocessing--outlier-cleaning-preprocessorpy)
  - [5.3 Agronomic Feature Engineering (`feature_engineering.py`)](#53-agronomic-feature-engineering-feature_engineeringpy)
- [6. Pipeline Orchestrator & Benchmark (`src/pipeline.py`)](#6-pipeline-orchestrator--benchmark-srcpipelinepy)
- [7. API Layer & Validation Schemas (`api/`)](#7-api-layer--validation-schemas-api)
  - [7.1 Pydantic Validation Schemas (`api/schemas.py`)](#71-pydantic-validation-schemas-apischemaspy)
  - [7.2 FastAPI Service (`api/main.py`)](#72-fastapi-service-apimainpy)
- [8. Verification & Test Execution Results](#8-verification--test-execution-results)
- [9. How to Run Locally](#9-how-to-run-locally)
- [10. Upcoming Roadmap Milestones](#10-upcoming-roadmap-milestones)

---

## 1. Overview of Implementation

In accordance with the **[Implementation Plan v1.0](./Documentation/IMPLEMENTATION_PLAN_V1.md%20—%20Intelligent%20Pest%20Outbreak%20Prediction%20&%20Early%20Warning%20Framework.md)**, Phase 1 (Research & Data Curation) and Phase 2 (Data Ingestion, Preprocessing & Feature Engineering) have been initialized with high modularity and human-written developer conventions:

- **Multi-Crop Data Ingestion:** Unified pipeline consuming both **Rice ICAR surveillance records** and **Cotton ICAR surveillance records**, spanning **35,499 historical weekly field observations**.
- **IoT & Multi-Pest Support:** Integrated automated electronic **smart-trap insect catch timeseries** and **8-pest agro-climatic observation** datasets.
- **Bio-Climatic Feature Extraction:** Automated computation of **Growing Degree-Days (GDD)**, diurnal temperature ranges, humidity deficit indicators, and cyclical weekly sine/cosine temporal encodings.
- **Ground-Truth Outbreak Labeling:** Automated binary and multi-class risk classification using official **Economic Threshold Levels (ETL)** from ICAR and TNAU guidelines.
- **REST API Endpoints:** Complete FastAPI application with request/response validation, health monitoring, reference lookups, and micro-climatic early warning risk evaluation.

---

## 2. Directory & Module Architecture

```text
Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/
│
├── api/                                       # FastAPI Service Layer
│   ├── __init__.py
│   ├── main.py                                # Application routes & risk evaluation endpoint
│   └── schemas.py                             # Pydantic request & response models
│
├── src/                                       # Core Framework Engine
│   ├── __init__.py
│   ├── config.py                              # Central paths, bio-thresholds & risk parameters
│   ├── pipeline.py                            # End-to-end data pipeline CLI runner
│   │
│   ├── data/                                  # Data Engineering Package
│   │   ├── __init__.py
│   │   ├── loader.py                          # Multi-dataset ingestion (CSV & Excel)
│   │   ├── preprocessor.py                    # Sensor boundary checks & missing data imputation
│   │   └── feature_engineering.py             # GDD, temporal lags, VPD & ETL labels
│   │
│   └── utils/                                 # Shared Utilities
│       ├── __init__.py
│       └── logger.py                          # Clean structured logger
│
├── artifacts/                                 # Generated Artifacts (Auto-created)
│   ├── processed/
│   │   ├── processed_surveillance.csv         # 35,499 cleaned records with 38 features
│   │   └── processed_smart_traps.csv          # Cleaned IoT insect catch telemetry
│   └── models/                                # Model registry checkpoint directory
│
├── Dataset/                                   # Real-world agronomic & pest datasets
├── Documentation/                             # Specifications (PRD, TRD, Architecture, Plan)
├── requirements.txt                           # Production & development dependencies
├── .gitignore                                 # Git rules for OS, Python, and Node artifacts
└── README.md                                  # Repository documentation
```

---

## 3. Environment & Dependencies (`requirements.txt`)

Locked dependencies organized by category:

```txt
# Core Data Science & Modeling
numpy>=1.26.0
pandas>=2.2.0
scikit-learn>=1.4.0
xgboost>=2.0.0
lightgbm>=4.3.0
shap>=0.44.0
openpyxl>=3.1.2
scipy>=1.12.0

# API & Backend Services
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9

# Persistence & Serialization
joblib>=1.3.0

# Development & Testing (Optional)
matplotlib>=3.8.0
seaborn>=0.13.0
pytest>=8.0.0
```

---

## 4. Central Configuration (`src/config.py`)

Centralized configuration module decoupling constants from logic:

* **Path Resolution:** Dynamically locates project directories (`Dataset/`, `artifacts/processed/`, `artifacts/models/`) using `pathlib.Path`.
* **Column Harmonization Mapping (`COLUMN_MAPPINGS`):** Standardizes differing column naming conventions between ICAR Rice (`MaxT`) and ICAR Cotton (`MaxT(°C)`).
* **Biological Base Temperatures (`BASE_TEMPERATURES`):** Physiological developmental thresholds ($T_{base}$ in °C) for calculating degree-days:
  - *Brown Planthopper:* $12.0^\circ\text{C}$
  - *Yellow Stem Borer:* $10.0^\circ\text{C}$
  - *Leaf Folder:* $11.5^\circ\text{C}$
  - *Cotton Bollworm / Pink Bollworm:* $12.5^\circ\text{C}$
  - *Fall Armyworm (*Spodoptera*):* $10.9^\circ\text{C}$
* **Economic Threshold Levels (`ECONOMIC_THRESHOLD_LEVELS`):** Official damage thresholds per insect species for binary outbreak flagging ($Y \in \{0, 1\}$).
* **Risk Stratification Matrix (`RISK_LEVELS`):**
  - `LOW`: $P < 0.30$ (Routine scouting)
  - `MODERATE`: $0.30 \le P < 0.60$ (Increase scouting frequency)
  - `HIGH`: $0.60 \le P < 0.80$ (Prepare bio-control / neem barriers)
  - `CRITICAL`: $P \ge 0.80$ (Initiate immediate targeted IPM intervention)

---

## 5. Data Engineering Pipeline (`src/data/`)

### 5.1 Multi-Source Dataset Loader (`src/data/loader.py`)
- **`load_dataset(dataset_key)`:** Loads datasets with fallback character encodings (`utf-8` and `latin1`).
- **`load_surveillance_data(crop="all")`:** Ingests and merges Rice ICAR (`19,404` rows) and Cotton ICAR (`16,095` rows) surveillance datasets into a unified dataframe.
- **`load_smart_trap_data()`:** Ingests IoT automated smart-trap observations and parses temporal timestamps.
- **`load_reference_tables()`:** Loads TNAU crop pest thresholds, IPM chemical/biological remedies, and agronomic crop phenology guides.

### 5.2 Preprocessing & Outlier Cleaning (`src/data/preprocessor.py`)
- **`sanitize_pest_name()`:** Strips collection suffixes (e.g., `- LT`, `- PT`) and normalizes case/spelling across datasets.
- **`remove_sensor_outliers()`:** Validates observations against physical agro-climatic boundaries (temperature $-5^\circ\text{C} \text{ to } 55^\circ\text{C}$, relative humidity $5\% \text{ to } 100\%$, sunshine hours $0 \text{ to } 16\text{ hrs}$). Clips sensor faults to `NaN`.
- **`handle_missing_values()`:** Applies localized forward/backward fill within historical station time-series groups, followed by robust median imputation.
- **`clean_surveillance_data()`:** High-level cleaning pipeline orchestrating the above transformations.

### 5.3 Agronomic Feature Engineering (`src/data/feature_engineering.py`)
- **`compute_gdd()`:** Computes thermal unit accumulation using the physiological formula:
  $$\text{GDD} = \max\left(\frac{T_{max} + T_{min}}{2} - T_{base}, \; 0\right)$$
- **`estimate_vapor_pressure_deficit()`:** Calculates Vapor Pressure Deficit ($\text{VPD}$ in kPa) via the Tetens formulation:
  $$e_s(T) = 0.61078 \exp\left(\frac{17.27 \cdot T}{T + 237.3}\right)$$
  $$\text{VPD} = e_s(T_{mean}) \times \left(1 - \frac{RH_{mean}}{100}\right)$$
- **`generate_temporal_lags()`:** Generates 1-week and 2-week history lag features ($t-1, t-2$) for temperature, humidity, rainfall, and pest counts.
- **`assign_outbreak_labels()`:** Compares field counts against pest-specific ETLs to produce `outbreak_current` ($t$) and forward lead-time target `outbreak_next_week` ($t+1$).
- **Cyclical Meteorological Week Encoding:** Encodes week 1 to 52 into continuous sine and cosine components:
  $$\text{week\_sin} = \sin\left(\frac{2\pi \cdot \text{week}}{52}\right), \quad \text{week\_cos} = \cos\left(\frac{2\pi \cdot \text{week}}{52}\right)$$

---

## 6. Pipeline Orchestrator & Benchmark (`src/pipeline.py`)

A standalone CLI runner that ingests, cleans, engineers features, encodes categories, scales signals, and splits data into ML-ready matrices:

```bash
python3 -m src.pipeline --crop all --split-method temporal
```

### Benchmark Output on Full Dataset:
```text
======================================================================
🌾 INTELLIGENT PEST OUTBREAK FRAMEWORK — DATASET PREPARATION SUMMARY
======================================================================
Total Consolidated Records     : 35,499
Crops Monitored                : ['Rice', 'Cotton']
Unique Pest Species            : 23
Geographic Locations (Stations): 12 centers
Clean Missing Values (NaN)     : 0 remaining (100% clean)
----------------------------------------------------------------------
📦 PREPARED TRAINING & TESTING DATASETS
----------------------------------------------------------------------
Split Strategy                 : TEMPORAL (Cutoff: year <= 2006)
Training Observations (X_train): 27,439 rows (77.3%)
Testing Observations  (X_test) : 8,060 rows (22.7%)
ML Feature Dimensions          : 92 input columns (numeric + one-hot categories)
Train Outbreak Rate (t+1)      : 44.93%
Test Outbreak Rate (t+1)       : 50.94%
----------------------------------------------------------------------
📂 GENERATED ARTIFACTS IN artifacts/processed/ & artifacts/models/
----------------------------------------------------------------------
 • Tabular Raw Train CSV       : train.csv (27,439 rows)
 • Tabular Raw Test CSV        : test.csv (8,060 rows)
 • Encoded ML X_train Matrix   : X_train.parquet / X_train.csv ((27439, 92))
 • Encoded ML X_test Matrix    : X_test.parquet / X_test.csv ((8060, 92))
 • Targets (y_train / y_test)  : y_train.csv / y_test.csv (binary, multiclass, regression)
 • Preprocessor Pipeline       : preprocessor.joblib (ColumnTransformer/Scaler/OHE)
 • Multi-Pest Weather Splits   : multi_pest_weather_train.csv (956), test.csv (240)
 • IoT Smart Trap Telemetry    : processed_smart_traps.csv (153 rows)
 • Regional Infestation Splits : regional_infestations_train.csv (800), test.csv (200)
======================================================================
```

---

## 7. Categorical Encoding & Scaler Pipeline (`src/data/encoder.py`)

The `SurveillanceDataPreprocessor` class provides a unified Scikit-Learn-compatible transformation pipeline:
- **One-Hot Encoding:** Applied to `['crop', 'pest_name', 'location', 'life_stage', 'collection_type']` with `handle_unknown='ignore'`.
- **Standard Scaling:** Normalizes 30 continuous meteorological, degree-day, vapor pressure deficit, and autoregressive lag variables to $\mathcal{N}(0, 1)$ strictly fitted on the training split.
- **Ordinal / Integer Encoding:** Generates `{feature}_code` columns for tree algorithms with native categorical handling (LightGBM/CatBoost).
- **Serialization & Reproducibility:** Fitted pipeline is saved to `artifacts/models/preprocessor.joblib` and feature schema dictionary to `artifacts/models/feature_metadata.json` for deterministic API inference.

---

## 8. Dataset Splitting & Preprocessing Orchestrator (`src/data/split.py`)

- **Temporal Split (Primary):** Chronological holdout splitting on year $\le 2006$ (Train: 27,439 observations) vs $> 2006$ (Test: 8,060 observations), simulating real-world predictive lead time without future-lookahead data leakage.
- **Target Separation:**
  - `outbreak_next_week`: Binary classification ground-truth label ($t+1$).
  - `risk_category`: 4-tier ordinal severity level (0: Negligible, 1: Moderate, 2: High, 3: Critical).
  - `pest_count`: Continuous numeric pest population count for regression modeling.
- **Auxiliary Dataset Pipelines:**
  - `Multi-Pest Weather`: Categorical label-encoded target, 80/20 stratified split.
  - `IoT Smart Trap`: Timestamp parsing, localized moving metrics, and sensor sanity validation.
  - `Regional Infestations`: State, season, and life-cycle categorical encoding with stratified severity split.

---

## 9. API Layer & Validation Schemas (`api/`)

### 9.1 Pydantic Validation Schemas (`api/schemas.py`)
- `WeatherObservation`: Validates temperature ($-10^\circ\text{C}$ to $60^\circ\text{C}$), morning/evening RH ($0\%$ to $100\%$), rainfall, wind speed, sunshine hours, and evaporation.
- `PredictionRequest`: Enforces crop name, pest species, location, standard meteorological week ($1 \le \text{SMW} \le 53$), current field scout count, and embedded `WeatherObservation`.
- `PredictionResponse`: Returns calibrated risk score ($0.0 \text{ to } 1.0$), categorical risk level, early warning boolean flag, GDD accumulation, RH differential, top contributing climatic factors, and prescriptive advisory text.
- `HealthCheckResponse`: Returns live system status and record counts.

### 9.2 FastAPI Service (`api/main.py`)
Exposes versioned REST endpoints under `/api/v1`:
* **`GET /`**: Welcome message, service status, and link to interactive Swagger `/docs`.
* **`GET /api/v1/health`**: Health diagnostic reporting dataset readiness and processed record counts.
* **`GET /api/v1/reference/pests`**: Returns all 23 monitored pest species with their respective $T_{base}$ and ETL thresholds.
* **`GET /api/v1/reference/advisories`**: Returns official TNAU & IPM guidelines for in-field interventions.
* **`GET /api/v1/models/benchmark`**: Returns live benchmark evaluation metrics across all 5 candidate ML models.
* **`POST /api/v1/predictions/evaluate`**: Real-time bio-climatic risk scoring using the champion Machine Learning model (`Random Forest`), computing degree-days, VPD, and local feature attributions.

---

## 10. Machine Learning & Prediction Engine (`src/ml/`)

In accordance with **Phase 3** of the Implementation Plan, the automated model training, evaluation, champion selection, and SHAP explainability pipeline has been fully developed:

### 10.1 Candidate Model Suite (`src/ml/train.py`)
Trains 5 justified candidate algorithms on the 92 engineered & scaled features in `X_train` ($27,439$ records):
1. **Logistic Regression:** Regularized linear baseline with balanced class weights.
2. **Decision Tree Classifier:** Non-linear decision baseline (max depth 8, min samples split 20).
3. **Random Forest Classifier:** Bagging ensemble of 100 decision trees (max depth 14).
4. **LightGBM Classifier:** Fast histogram gradient boosting (150 estimators, learning rate 0.05).
5. **XGBoost Classifier:** Regularized gradient boosting (150 estimators, learning rate 0.05, subsample 0.8).

### 10.2 Model Evaluation & Benchmark Protocol (`src/ml/evaluate.py`)
All models were evaluated on the future holdout test split ($2007-2011$, **$8,060$ records**), simulating real-world predictive lead time:

```text
============================================================================================
🏆 PEST OUTBREAK EARLY WARNING (t+1) — MODEL BENCHMARK COMPARISON
============================================================================================
Model                  | Accuracy  | Recall   | Precision  | F1-Score  | ROC-AUC  | FNR   
--------------------------------------------------------------------------------------------
Logistic Regression    | 0.9026    | 0.9050   | 0.9039     | 0.9045    | 0.9321   | 0.0950
Decision Tree          | 0.8963    | 0.9050   | 0.8928     | 0.8989    | 0.9454   | 0.0950
Random Forest ★        | 0.9030    | 0.9128   | 0.8984     | 0.9055    | 0.9571   | 0.0872
LightGBM               | 0.9016    | 0.9065   | 0.9010     | 0.9037    | 0.9599   | 0.0935
XGBoost                | 0.9033    | 0.9043   | 0.9058     | 0.9051    | 0.9603   | 0.0957
--------------------------------------------------------------------------------------------
★ CHAMPION MODEL        : Random Forest
  • Primary Metric (f1_score): 0.9055
  • Outbreak Recall     : 91.28% (True Positive Rate)
  • Outbreak Precision  : 89.84%
  • False Negatives     : 358 out of 4,106 outbreaks missed (8.72%)
  • ROC-AUC Score       : 0.9571
============================================================================================
```

- **Champion Model:** **Random Forest** achieved the highest Outbreak Recall (**91.28%**) and lowest False Negative Rate (**8.72%**), which is critical in agricultural early-warning systems to ensure farmers are never caught off-guard by undetected outbreaks.
- **Top Discrimination:** **XGBoost** achieved the highest ROC-AUC (**0.9603**), closely followed by LightGBM (**0.9599**) and Random Forest (**0.9571**).

### 10.3 Explainable AI with SHAP (`src/ml/explain.py`)
- **Global Feature Attributions:** Generated TreeExplainer summary plot at `artifacts/models/shap_summary.png`. Top driving features:
  1. *Outbreak Current ($t$)* — Prevailing field infestation baseline.
  2. *Field Scout Population vs ETL* — Ratio of in-field insects to Economic Threshold Level.
  3. *Previous Week Pest Lag ($t-1, t-2$)* — Autoregressive temporal momentum.
  4. *Growing Degree-Days (GDD)* — Physiological heat unit accumulation accelerating life cycle transitions.
  5. *Vapor Pressure Deficit (VPD)* & *Morning Humidity* — Canopy micro-climatic moisture persistence.
- **Local Single-Prediction Explainer:** Dynamically computes top positive threat factors and dampening factors for individual API requests.

### 10.4 Machine Learning CLI Orchestrator (`src/ml/pipeline.py`)
Run the full ML training, evaluation, champion selection, and SHAP generation with one command:
```bash
python3 -m src.ml.pipeline --metric f1_score --shap-samples 500
```

---

## 11. Verification & Test Execution Results

All routes and features were validated via automated test execution:

```python
# Test 1: Health Endpoint
client.get('/api/v1/health')
# Result: 200 OK -> {'status': 'healthy', 'datasets_ready': True, 'total_surveillance_records': 35499}

# Test 2: Model Benchmark Endpoint
client.get('/api/v1/models/benchmark')
# Result: 200 OK -> {'champion_model': 'Random Forest', 'champion_score': 0.9055, 'models': {...}}

# Test 3: ML-Powered Prediction Evaluation
client.post('/api/v1/predictions/evaluate', json={
    'crop': 'Rice',
    'pest_name': 'Brown Planthopper',
    'location': 'Cuttack',
    'standard_week': 32,
    'current_pest_count': 6.0,
    'weather': {
        'temp_max': 31.5,
        'temp_min': 25.0,
        'rh_morning': 92.0,
        'rh_evening': 74.0,
        'rainfall': 45.0,
        'wind_speed': 3.5,
        'sunshine_hours': 6.0,
        'evaporation': 4.0
    }
})
# Result: 200 OK ->
# {
#   "risk_score": 0.94,
#   "risk_level": "CRITICAL",
#   "is_warning": True,
#   "gdd_accumulated": 16.25,
#   "rh_differential": 18.0,
#   "top_factors": [
#     {"feature": "Outbreak Current", "impact": "Elevating Risk", "description": "Observed feature signal: 1.11 (Attribution weight: 0.344)"},
#     {"feature": "Field Scout Population vs ETL", "impact": "Moderating Risk", "description": "Observed feature signal: -0.13 (Attribution weight: 0.207)"}
#   ],
#   "advisory": "Status: CRITICAL. Initiate immediate targeted IPM intervention. Target ETL threshold for Brown Planthopper is 5.0. Accumulated degree-days: 16.2 GDD. VPD: 0.65 kPa.",
#   "model_version": "v2.0-ml-random-forest"
# }
```

---

## 12. How to Run Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Data Preprocessing Pipeline
```bash
# Process all crops with temporal split (<=2006 train, >2006 test)
python3 -m src.pipeline --crop all --split-method temporal
```

### 3. Run the Machine Learning Training & Benchmark Suite
```bash
# Train candidate models, evaluate, select champion, and generate SHAP plots
python3 -m src.ml.pipeline
```

### 4. Launch the FastAPI Development Server
```bash
uvicorn api.main:app --reload --port 8000
```
Open **[http://localhost:8000/docs](http://localhost:8000/docs)** to test the interactive OpenAPI Swagger UI in your browser.

---

## 13. Upcoming Roadmap Milestones

With **Phase 2 (Data Engineering)** and **Phase 3 (Machine Learning Engine & SHAP Explainability)** complete, the next milestone is **Phase 4**:
1. **Interactive Full-Stack Dashboard / Web UI:** An intuitive, responsive dashboard with dynamic maps of India, crop risk gauges, historical surveillance charts, and automated IPM alert generators.
2. **Alert Notification Service:** Automated email / SMS / WhatsApp advisory dispatches when in-field sensors cross warning thresholds.
3. **Database Integration:** SQLite / PostgreSQL persistence for real-time field scout telemetry and model prediction audit logs.
