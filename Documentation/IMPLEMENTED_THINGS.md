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

A standalone CLI runner that ingests, cleans, features, and persists processed model datasets:

```bash
python3 -m src.pipeline --crop all
```

### Benchmark Output on Full Dataset:
```text
=================================================================
📊 DATASET PIPELINE DIAGNOSTIC SUMMARY
=================================================================
Total Surveillance Records : 35,499
Crops Represented          : ['Rice', 'Cotton']
Pests Monitored            : 12 unique species
Top 5 Pests                : {'Unknown': 16095, 'Yellow Stem Borer': 4333, 'Gall Midge': 3016, 'Greenleafhopper': 2287, 'Leafblast': 2090}
Outbreak Label Distribution: 0 (Normal): 19,209, 1 (Outbreak): 16,290
Outbreak Class Rate (t+1)  : 45.89%
Smart Trap Telemetry Rows  : 153
Engineered Feature Columns : 38
=================================================================
```

---

## 7. API Layer & Validation Schemas (`api/`)

### 7.1 Pydantic Validation Schemas (`api/schemas.py`)
- `WeatherObservation`: Validates temperature ($-10^\circ\text{C}$ to $60^\circ\text{C}$), morning/evening RH ($0\%$ to $100\%$), rainfall, wind speed, sunshine hours, and evaporation.
- `PredictionRequest`: Enforces crop name, pest species, location, standard meteorological week ($1 \le \text{SMW} \le 53$), current field scout count, and embedded `WeatherObservation`.
- `PredictionResponse`: Returns calibrated risk score ($0.0 \text{ to } 1.0$), categorical risk level, early warning boolean flag, GDD accumulation, RH differential, top contributing climatic factors, and prescriptive advisory text.
- `HealthCheckResponse`: Returns live system status and record counts.

### 7.2 FastAPI Service (`api/main.py`)
Exposes versioned REST endpoints under `/api/v1`:
* **`GET /`**: Welcome message, service status, and link to interactive Swagger `/docs`.
* **`GET /api/v1/health`**: Health diagnostic reporting dataset readiness and processed record counts.
* **`GET /api/v1/reference/pests`**: Returns all 10 monitored pest species with their respective $T_{base}$ and ETL thresholds.
* **`GET /api/v1/reference/advisories`**: Returns official TNAU & IPM guidelines for in-field interventions.
* **`POST /api/v1/predictions/evaluate`**: Real-time bio-climatic risk scoring computing GDD, humidity persistence, and actionable advisory output.

---

## 8. Verification & Test Execution Results

All routes and features were validated via automated test execution:

```python
# Test 1: Health Endpoint
client.get('/api/v1/health')
# Result: 200 OK -> {'status': 'healthy', 'datasets_ready': True, 'total_surveillance_records': 35499}

# Test 2: Reference Data
client.get('/api/v1/reference/pests')
# Result: 200 OK -> 10 monitored pests returned

# Test 3: Prediction Evaluation
client.post('/api/v1/predictions/evaluate', json={
    'crop': 'Rice',
    'pest_name': 'Brownplanthopper',
    'location': 'Cuttack',
    'standard_week': 32,
    'current_pest_count': 6.0,
    'weather': {
        'temp_max': 31.5,
        'temp_min': 25.0,
        'rh_morning': 92.0,
        'rh_evening': 74.0,
        'rainfall': 45.0
    }
})
# Result: 200 OK ->
# {
#   "risk_score": 0.98,
#   "risk_level": "CRITICAL",
#   "is_warning": True,
#   "gdd_accumulated": 16.25,
#   "rh_differential": 18.0,
#   "advisory": "Status: CRITICAL. Initiate immediate targeted IPM intervention. Target ETL threshold for Brownplanthopper is 5.0. Accumulated degree-days: 16.2 GDD."
# }
```

---

## 9. How to Run Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Data Preprocessing Pipeline
```bash
# Process all crops (Rice + Cotton) and generate features
python3 -m src.pipeline --crop all

# Or process only rice
python3 -m src.pipeline --crop rice
```

### 3. Launch the FastAPI Development Server
```bash
uvicorn api.main:app --reload --port 8000
```
Open **[http://localhost:8000/docs](http://localhost:8000/docs)** to test the interactive OpenAPI Swagger UI in your browser.

---

## 10. Upcoming Roadmap Milestones

Now that Phase 2 data engineering is initialized and operating, the next recommended milestones from Phase 3 are:
1. **Model Training Script (`src/ml/train.py`):** Train baseline Decision Tree, Random Forest, and XGBoost models on the 38 engineered features in `artifacts/processed/processed_surveillance.csv`.
2. **Model Evaluation & Cross-Validation (`src/ml/evaluate.py`):** Calculate stratified Precision, Recall, F1, ROC-AUC, and Early Warning Lead Time.
3. **SHAP Feature Importance Engine (`src/ml/explain.py`):** Save global and local explainability vectors for prediction explanations.
