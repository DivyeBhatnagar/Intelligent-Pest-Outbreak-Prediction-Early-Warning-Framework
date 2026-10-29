# B.Tech Project – Mid-Term & Phase III Evaluation 2026–27
**Project Title:** Intelligent Pest Outbreak Prediction & Early Warning Framework  
**Domain:** Artificial Intelligence / Machine Learning + AgriTech & Decision Support  
**Author / Candidate:** Divye Bhatnagar  
**Repository:** [GitHub Repository](https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework)  

---

# Mid-Term Evaluation — Progress & Evidence

### 1. Current Implementation / Prototype Status *
**Describe what has actually been implemented so far.**
- **Completed Modules & Components:**
  - **Data Ingestion & Harmonization Pipeline (`src/data/loader.py`, `src/data/preprocessor.py`):** Unified ingestion for multi-source ICAR agricultural datasets (Rice and Cotton surveillance) across 11 Indian agrometeorological research stations with 35,499 cleaned surveillance records.
  - **Bio-Climatic Feature Engineering (`src/data/feature_engineering.py`):** Automated computation of species-specific Growing Degree-Days (GDD using $T_{\text{base}}$ thresholds), Vapor Pressure Deficit (VPD via Tetens' formula), Diurnal Temperature Range ($\Delta T$), relative humidity differentials, and cyclical Standard Meteorological Week (SMW) trigonometric encodings.
  - **Machine Learning Core & Model Registry (`src/ml/train.py`, `src/ml/explain.py`):** Multi-model training and evaluation harness (Random Forest, XGBoost, LightGBM, ExtraTrees, Logistic Regression, and Quad-Ensemble). Full implementation of TreeSHAP for local and global model explainability.
  - **REST API Backend (`api/main.py`, `api/schemas.py`):** Production-grade FastAPI service exposing 14+ endpoints for prediction inference, live weather fetching, observation recording, alert deduplication, SHAP explanations, and historical audit trail logging.
  - **Relational Persistence Layer (`api/db.py`):** SQLite database configured in WAL mode (`artifacts/pest_framework.db`) with schemas for in-field observations, alert lifecycle management, and prediction audit tracking.
  - **Frontend Surveillance & Early-Warning Dashboard (`frontend/` & `api/dashboard.html`):** Interactive React/Vite/TypeScript dashboard and standalone HTML dashboard featuring live Leaflet geospatial station maps, risk evaluation forms, SHAP waterfall visualizations, alert management, and historical trends.
- **Current Prototype Status:**
  - Fully functional end-to-end prototype operational locally with synchronous backend-frontend communication, real-time Open-Meteo weather integration, and offline benchmark fallback.
- **What is Currently Working:**
  - Live prediction for 7-to-15 day outbreak risk scoring with automated 4-tier risk stratification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
  - Automated alert generation with deduplication for high-risk predictions.
  - Field scouting observation logging and retrieval.
  - Interactive SHAP feature attribution calculation per prediction.
  - Complete automated test suite passing with 40/40 tests verified (`pytest`).

---

### 2. Design / Architecture & Validation *
**Briefly describe the current system design/architecture and how the design has been validated so far. Mention any important changes made to the original design and why.**
- **System Architecture:**
  - The framework implements a modular 4-tier Service-Oriented Architecture (SOA):
    1. *Presentation Layer:* React 18 / TypeScript SPA (Vite) + standalone server-rendered dashboard using TailwindCSS and Leaflet for geospatial visualization.
    2. *API Gateway & Orchestration Layer:* FastAPI with Uvicorn and Pydantic v2 schemas for strict parameter validation and type enforcement.
    3. *Application & Intelligence Layer:* Modular Python engine decoupling ETL pipelines, ML inference, and SHAP explainability.
    4. *Persistence & Artifact Store:* Relational SQLite database with WAL journaling alongside serialized Joblib models, preprocessors, and JSON benchmark registries.
- **Validation Approach:**
  - Evaluated on holdout test partitions (8,109 samples) extracted from 35,499 historical ICAR field surveillance records.
  - Rigorous metric benchmarking (Accuracy, Precision, Recall, F1-Score, ROC-AUC, PR-AUC, and False Negative Rate).
  - Validated through an automated test suite (`tests/test_framework.py`) with 40 test cases covering data loading, feature engineering, ETL threshold logic, model inference, and API endpoints.
- **Important Design Changes & Rationale:**
  - *Shift from Raw Weather to Agronomic Derived Metrics:* Early iterations relied on raw temperature and humidity. Validation showed insect lifecycle emergence correlates much stronger with degree-days (GDD) and Vapor Pressure Deficit (VPD). Incorporating these thermodynamic features boosted F1-score from ~0.84 to >0.90.
  - *Prioritization of Recall over Pure Accuracy:* In agricultural pest management, a false negative (failing to alert a farmer to an outbreak) causes catastrophic economic losses, whereas a false positive merely triggers scouting. Hence, model selection was pivoted to optimize F1-score and minimize False Negative Rate (FNR) to <9%.
  - *Dual Frontend Strategy:* Maintained both a lightweight monolithic dashboard (`api/dashboard.html`) for immediate zero-dependency field deployment and a modern modular React TypeScript dashboard (`frontend/`) for rich UI/UX.

---

### 3. Testing / Experimental Results So Far *
**Describe the testing or experiments performed so far. Provide actual observations, measurements, results or findings where available. Do not provide only expected results.**
- **Model Benchmark Results (Tested on 8,109 Holdout Test Set):**
  - **Random Forest (Selected Champion Model):**
    - **Accuracy:** `90.46%`
    - **F1-Score:** `0.9067`
    - **Recall (Detection Rate):** `91.01%`
    - **Precision:** `90.33%`
    - **ROC-AUC:** `0.9560` | **PR-AUC:** `0.9530`
    - **False Negative Rate (FNR):** `8.99%` (Lowest among standalone models; missed only 369 out of 4,106 actual outbreaks).
  - **Candidate Models Benchmarked:**
    - *Quad-Ensemble (RF + XGB + LGBM + LR):* Accuracy: `90.37%`, F1-Score: `0.9052`, Recall: `90.19%`, ROC-AUC: `0.9581`.
    - *XGBoost Classifier:* Accuracy: `90.14%`, F1-Score: `0.9028`, Recall: `89.92%`, ROC-AUC: `0.9583`.
    - *LightGBM Classifier:* Accuracy: `90.02%`, F1-Score: `0.9021`, Recall: `90.26%`, ROC-AUC: `0.9580`.
    - *Logistic Regression (Baseline):* Accuracy: `90.26%`, F1-Score: `0.9045`, Recall: `90.50%`, ROC-AUC: `0.9321`.
    - *Decision Tree:* Accuracy: `89.31%`, F1-Score: `0.8957`, Recall: `90.16%`, ROC-AUC: `0.9466`.
    - *ExtraTrees:* Accuracy: `89.35%`, F1-Score: `0.8936`, Recall: `87.73%`, ROC-AUC: `0.9475`.
- **Full Dataset Verification (35,499 samples):**
  - Random Forest achieved `97.83%` Accuracy, `97.74%` Recall, `0.9766` F1-score, and `0.9958` ROC-AUC.
- **SHAP Feature Attribution Findings:**
  - Top 3 predictive drivers of outbreaks: (1) Current localized population vs. ETL threshold ratio, (2) Accumulated Growing Degree-Days (GDD), and (3) Morning Relative Humidity ($\text{RH}_{\text{morning}} > 88\%$).
- **Software Suite Testing:**
  - Automated test suite: `40 passed, 0 failed` in 7.15s across all pipeline components.

---

### 4. Supporting Evidence / Repository / Demonstration Links – Mid-Term *
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/tree/main/artifacts/models  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/blob/main/docs/ARCHITECTURE_AND_EVALUATION.md  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/blob/main/docs/IMPLEMENTED_THINGS.md  

---

### 5. Major Challenges / Pending Work (Optional) *
**Briefly mention significant technical challenges, dependencies, or important work that is still pending.**
- **Challenges Encountered:**
  - *Data Heterogeneity across Agro-Ecological Stations:* Disparate reporting formats between ICAR Rice stations and ICAR Cotton stations necessitated extensive column mapping and normalization.
  - *Auxiliary Task Class Imbalance:* Secondary multi-class models (micro-climate to 8-pest species classifier: 48.75% accuracy; regional severity tier classification: 33.50% accuracy) suffered from historical class imbalance compared to binary outbreak prediction.
- **Pending Work:**
  - Integration of satellite-derived vegetation indices (Sentinel-2 NDVI / EVI) for canopy vigor correlation.
  - SMS / WhatsApp push notification integration (Twilio / Gupshup) for direct farmer alerts.
  - Containerized deployment using Docker and cloud hosting on AWS / Render.

---
---

# Phase III — Implementation Evaluation

### 1. Implementation Completed *
**Describe the major modules, features or hardware/software components that have been implemented. Clearly distinguish completed work from work that is still in progress.**
- **Completed Implementation:**
  - **Data Processing Engine:** Complete ETL pipeline (`src/data/`) capable of loading CSV/Excel surveillance records, cleaning sensor boundaries, performing rolling temporal window aggregations, computing thermodynamic bio-climatic indices, and applying TNAU/ICAR Economic Threshold Levels (ETL).
  - **Machine Learning Core & Model Artifacts:** Production pipeline (`src/ml/train.py`, `src/ml/predict.py`) trained and serialized to disk (`best_model.joblib`, `preprocessor.joblib`, `model_comparison.json`). Champion model (Random Forest) tuned and validated.
  - **Explainability Subsystem:** Model-agnostic TreeSHAP implementation (`src/ml/explain.py`) generating feature contribution values for single-sample inference and global summary plots.
  - **FastAPI Backend Server:** Fully integrated REST API (`api/main.py`) with 14 endpoints including prediction evaluation (`/api/v1/predictions/evaluate`), SHAP attribution (`/api/explain`), live ICAR station weather (`/api/stations`), scouting observation CRUD (`/api/observations`), alerts deduplication (`/api/alerts`), and audit trail logging (`/api/v1/audit/predictions`).
  - **Database & Persistence:** SQLite database in WAL mode (`api/db.py`) storing scouting records, prediction audits, and alert states.
  - **Surveillance Frontend Dashboard:** Dual-dashboard implementation featuring geospatial station mapping, risk simulation forms, SHAP waterfall charts, observation logs, and alert feeds.
  - **Automated Test Harness:** 40 comprehensive unit and integration tests passing (`tests/test_framework.py`).
- **Work in Progress:**
  - Ingestion of live satellite NDVI vegetation indices for biomass stress validation.
  - Multi-lingual advisory generator (Hindi, Telugu, Tamil, Punjabi) for local farmer usability.
  - Automated scheduled cron jobs for periodic weather polling and batch risk reassessment across all 11 stations.

---

### 2. Code / Hardware / System Integration Status *
**Describe the current integration status of the system. Where applicable, mention coding practices, documentation, module integration, hardware/software integration, APIs, databases, sensors, models or other major components.**
- **Module & System Integration:**
  - **API-Model Integration:** The FastAPI backend directly loads serialized Joblib model artifacts on startup via `lifespan` context management, ensuring low-latency inference (~35ms).
  - **Weather Telemetry Integration:** Synchronously integrated with Open-Meteo REST API (`src/utils/weather.py`) to fetch live ambient temperature, relative humidity, windspeed, and rainfall for 11 ICAR coordinates, with automated fallback to seasonal baselines if offline.
  - **Database Integration:** SQLite with WAL mode connection pooling integrated into API routes for recording observations, tracking model inputs/outputs, and managing alert states.
  - **Frontend-Backend Integration:** Full REST API contract binding Vite/React client services (`frontend/src/services/api.ts`) to backend endpoints with type-safe interfaces (`frontend/src/types/index.ts`).
- **Coding & Engineering Practices:**
  - Strict PEP 8 compliance, type annotations, and Pydantic v2 data models ensuring schema validation.
  - Defensive error handling, structured logging (`src/utils/logger.py`), and decoupled modular architecture.
  - Comprehensive documentation including PRD, TRD, Architecture, and API specifications in `/docs`.

---

### 3. Testing, Validation & Performance Results *
**Describe the testing and validation performed on the implemented system. Provide actual results or performance measurements wherever applicable, such as accuracy, latency, response time, error rate, test cases, benchmark results, hardware measurements or other relevant metrics.**
- **Machine Learning Benchmark & Performance:**
  - **Champion Model:** Random Forest Classifier.
  - **Test Set Size:** 8,109 samples (Holdout test split).
  - **Accuracy:** `90.46%`
  - **Precision:** `90.33%`
  - **Recall:** `91.01%` (Minimizing unflagged outbreaks)
  - **F1-Score:** `0.9067`
  - **ROC-AUC:** `0.9560`
  - **PR-AUC:** `0.9530`
  - **False Negative Rate:** `8.99%`
  - **Full Dataset Verification (35,499 records):** Accuracy: `97.83%`, F1-Score: `0.9766`, ROC-AUC: `0.9958`.
- **System Latency & Response Times:**
  - **Prediction Inference Latency:** ~35ms to 50ms per evaluation request.
  - **SHAP Explanation Computation:** ~120ms for local TreeSHAP calculation.
  - **API Response Time:** <100ms for standard database queries and cached station lookups.
- **Software Test Suite:**
  - **Test Suite Status:** 40 / 40 test cases passing (`100% pass rate`).
  - **Test Execution Time:** 7.15 seconds (`pytest`).
  - **Coverage Areas:** Data loader integrity, feature transformations (GDD, VPD, cyclical encodings), model inference pipelines, database persistence, and API contract status codes.

---

### 4. Current Milestone Completion Status *
**Select one option:**
- Most planned milestones completed

*(Note: Data engineering, bio-climatic modeling, model selection, SHAP explainability, backend REST API, database persistence, interactive dashboards, and testing suite are 100% complete; pending items are external push notification relays and satellite NDVI streaming).*

---

### 5. Pending Milestones / Remaining Work *
**Briefly describe the important work that remains to be completed. If all planned milestones are complete, write "None".**
- Integration of live satellite earth observation feeds (Copernicus Sentinel-2 NDVI/EVI) to detect vegetative crop stress prior to visible insect damage.
- Deployment of automated outbound notification dispatcher (WhatsApp Business API / SMS gateway) for field-level agricultural alerts.
- Dockerization (`Dockerfile`, `docker-compose.yml`) and cloud hosting on production infrastructure (AWS / Render).
- Multi-language localization (Hindi, Marathi, Telugu) for user-facing farmer advisory outputs.

---

### 6. Supporting Evidence / Repository / Demonstration Links – Phase III *
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/blob/main/docs/ARCHITECTURE_AND_EVALUATION.md  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/blob/main/artifacts/models/model_comparison.json  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/blob/main/tests/test_framework.py  
https://github.com/DivyeBhatnagar/Intelligent-Pest-Outbreak-Prediction-Early-Warning-Framework/blob/main/api/main.py  
