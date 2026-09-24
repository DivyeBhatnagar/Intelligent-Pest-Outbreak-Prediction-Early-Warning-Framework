# Technical Requirements Document (TRD)

# Intelligent Pest Outbreak Prediction & Early Warning Framework

**Version:** 1.0  
**Status:** Technical Specification  
**Project Type:** Major Academic Project  
**Domain:** Artificial Intelligence + AgriTech  
**Mentor:** Dr. Swati Vashisht

---

# 1. Technical Overview

The **Intelligent Pest Outbreak Prediction & Early Warning Framework** is a machine-learning-powered agricultural intelligence system designed to estimate pest outbreak risk using environmental, agricultural, temporal, geographic, and historical pest data.

The system consists of five major technical layers:

```text
┌─────────────────────────────────────────────┐
│                Presentation Layer           │
│        Web Dashboard / Visualization        │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                   API Layer                  │
│              REST / Authentication           │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│             Application Services            │
│ Prediction │ Risk │ Alerts │ Analytics      │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────────┐   ┌──────────────────┐
│   ML Infrastructure  │   │ Database / Data  │
│ Training + Inference │   │ Storage          │
└──────────────────────┘   └──────────────────┘
```

---

# 2. Technical Objectives

The technical implementation must:

1. Provide a reproducible ML training pipeline.
2. Provide a reliable prediction/inference pipeline.
3. Convert model predictions into interpretable risk levels.
4. Support early-warning generation.
5. Provide REST APIs for frontend integration.
6. Store predictions, observations, and alerts.
7. Support model versioning.
8. Provide appropriate authentication and authorization.
9. Maintain modularity between ML, backend, frontend, and data layers.
10. Support future integration with real-time weather, IoT, satellite, and geospatial data.

---

# 3. System Architecture

## 3.1 Logical Architecture

```text
                         ┌───────────────┐
                         │     User      │
                         └───────┬───────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │   Web Dashboard   │
                       │ React / Next.js   │
                       └─────────┬─────────┘
                                 │ HTTPS
                                 ▼
                       ┌───────────────────┐
                       │    API Server     │
                       │      FastAPI      │
                       └─────────┬─────────┘
                                 │
          ┌──────────────────────┼─────────────────────┐
          │                      │                     │
          ▼                      ▼                     ▼
┌─────────────────┐    ┌─────────────────┐   ┌─────────────────┐
│ Prediction      │    │ Alert Service   │   │ Analytics       │
│ Service         │    │                 │   │ Service         │
└────────┬────────┘    └────────┬────────┘   └────────┬────────┘
         │                      │                     │
         └──────────────┬───────┴─────────────────────┘
                        ▼
              ┌────────────────────┐
              │   PostgreSQL DB    │
              └────────────────────┘

                        ▲
                        │
              ┌─────────┴─────────┐
              │   ML Inference    │
              │      Engine       │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │ Trained ML Model  │
              └───────────────────┘

External Data
     │
     ├── Weather APIs
     ├── Agricultural datasets
     ├── IoT sensors
     └── Satellite data
```

---

# 4. Technology Stack

## 4.1 Frontend

Recommended:

- Next.js / React
- TypeScript
- Tailwind CSS
- Recharts / Chart.js
- Leaflet / MapLibre for maps

Responsibilities:

- User interface
- Authentication screens
- Dashboard
- Prediction forms
- Alerts
- Analytics
- Risk visualization
- Geographic visualization

---

# 5. Backend

Recommended:

- Python
- FastAPI
- Pydantic
- Uvicorn
- SQLAlchemy
- PostgreSQL driver

Responsibilities:

- REST API
- Authentication
- Authorization
- Request validation
- Prediction orchestration
- Risk assessment
- Alert generation
- Database access
- Analytics
- Model management

---

# 6. Machine Learning Stack

Recommended:

- Python
- NumPy
- Pandas
- Scikit-learn
- XGBoost / LightGBM
- SHAP
- Joblib

Optional:

- MLflow
- PyTorch
- TensorFlow

The initial system should prefer classical ML models unless the available dataset justifies more complex deep-learning approaches.

---

# 7. Database

Recommended primary database:

**PostgreSQL**

Reasons:

- Structured relational data
- Strong consistency
- Geographic extensions possible
- Suitable for historical observations
- Supports complex analytical queries
- Easy integration with Python/FastAPI

---

# 8. Data Architecture

The data architecture should separate raw data from processed and model-ready data.

```text
External Sources
       │
       ▼
┌──────────────┐
│ Raw Dataset  │
└──────┬───────┘
       ▼
┌──────────────┐
│ Cleaned Data │
└──────┬───────┘
       ▼
┌──────────────┐
│ Feature Data │
└──────┬───────┘
       ▼
┌──────────────┐
│ ML Dataset   │
└──────┬───────┘
       ▼
┌──────────────┐
│ Model        │
└──────────────┘
```

---

# 9. Dataset Requirements

The model dataset should contain sufficient information to establish relationships between agricultural conditions and pest occurrence.

Potential fields:

| Field | Type | Required |
|---|---|---|
| Date | DateTime | Yes |
| Location | String/Geo | Yes |
| Crop | Categorical | Yes |
| Temperature | Float | Recommended |
| Humidity | Float | Recommended |
| Rainfall | Float | Recommended |
| Soil Moisture | Float | Optional |
| Crop Stage | Categorical | Recommended |
| Pest Type | Categorical | Recommended |
| Pest Occurrence | Boolean/Integer | Yes |
| Pest Severity | Numerical/Categorical | Optional |

The exact schema must be finalized after dataset selection.

---

# 10. Data Quality Requirements

The ingestion pipeline must validate:

- Null values
- Duplicate records
- Invalid numerical values
- Invalid dates
- Invalid categorical values
- Inconsistent units
- Impossible environmental readings

Example:

```text
Temperature = 250°C
```

should be flagged as invalid rather than passed directly into the model.

---

# 11. Data Preprocessing Pipeline

```text
Raw Data
   │
   ▼
Schema Validation
   │
   ▼
Missing Value Handling
   │
   ▼
Duplicate Removal
   │
   ▼
Outlier Detection
   │
   ▼
Categorical Encoding
   │
   ▼
Numerical Scaling
   │
   ▼
Temporal Processing
   │
   ▼
Feature Engineering
   │
   ▼
Model Dataset
```

---

# 12. Missing Data Handling

Different strategies may be applied depending on the feature.

Possible methods:

### Numerical

- Mean
- Median
- Interpolation
- Model-based imputation

### Categorical

- Mode
- Explicit `Unknown` category

### Time-Series

- Forward fill
- Interpolation
- Rolling statistics

The selected method must be documented and applied consistently between training and inference.

---

# 13. Outlier Handling

Outliers should not automatically be removed because extreme environmental conditions may contain meaningful information.

Possible approaches:

- IQR analysis
- Z-score
- Domain-based validation
- Winsorization
- Robust scaling

Outlier decisions must be documented.

---

# 14. Feature Engineering

The feature-engineering layer should be deterministic and reusable.

Potential derived features:

```text
temperature_7d_avg
humidity_7d_avg
rainfall_7d_total
rainfall_3d_total
temperature_change
humidity_change
previous_pest_incidence
days_since_last_observation
season
month
crop_stage
```

Example:

\[
Rainfall_{7d} = \sum_{i=1}^{7} Rainfall_i
\]

---

# 15. Temporal Data Handling

If time-series data is used, random splitting should be avoided when it creates temporal leakage.

Preferred approach:

```text
Historical Data
       │
       ├── Training Period
       │
       ├── Validation Period
       │
       └── Future Test Period
```

Example:

```text
2022–2024 → Training
2025       → Validation
2026       → Test
```

Actual periods depend on dataset availability.

---

# 16. Geographic Data

Each observation should optionally contain:

```text
latitude
longitude
region
district
state
country
```

Geographic information enables:

- Regional prediction
- Risk mapping
- Location-specific analytics
- Geographic validation

Future versions may use PostGIS for spatial operations.

---

# 17. Target Variable

The project can support multiple prediction formulations.

## Binary Classification

```text
0 → No outbreak
1 → Outbreak
```

## Multi-Class Classification

```text
LOW
MODERATE
HIGH
CRITICAL
```

## Regression

Predict a continuous pest severity/count value.

The initial implementation should select one primary target based on the selected dataset.

---

# 18. ML Model Architecture

The baseline architecture should support multiple candidate models.

```text
                  Dataset
                     │
                     ▼
             Feature Pipeline
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Logistic    Random     Gradient
     Regression   Forest      Boosting
          │          │          │
          └──────────┼──────────┘
                     ▼
              Model Evaluation
                     │
                     ▼
              Model Selection
                     │
                     ▼
              Model Registry
```

---

# 19. Baseline Model

The first model should be a simple baseline such as Logistic Regression or Decision Tree.

Purpose:

- Establish reference performance.
- Validate the feature pipeline.
- Identify whether the dataset contains predictive signal.

---

# 20. Candidate Models

The project should evaluate multiple models.

### Random Forest

Useful for:

- Non-linear relationships
- Mixed features
- Feature importance

### XGBoost

Useful for:

- Tabular data
- Non-linear interactions
- Strong predictive performance

### LightGBM

Useful for:

- Larger tabular datasets
- Fast training
- High-dimensional features

### CatBoost

Useful for:

- Categorical variables
- Tabular datasets

---

# 21. Model Selection

Model selection must be based on measured validation performance.

Primary metrics may include:

- Recall
- Precision
- F1 Score
- ROC-AUC
- PR-AUC

Accuracy should not be used as the only selection criterion, especially if outbreak classes are imbalanced.

---

# 22. Class Imbalance

If outbreak observations are significantly less frequent than non-outbreak observations, the system should detect class imbalance.

Possible solutions:

- Class weights
- Random oversampling
- SMOTE
- Threshold optimization
- Stratified sampling

SMOTE or resampling must be applied only to the training data to prevent leakage.

---

# 23. Model Evaluation

Required metrics:

### Accuracy

\[
Accuracy = \frac{TP+TN}{TP+TN+FP+FN}
\]

### Precision

\[
Precision = \frac{TP}{TP+FP}
\]

### Recall

\[
Recall = \frac{TP}{TP+FN}
\]

### F1

\[
F1 = 2\frac{Precision \times Recall}
{Precision + Recall}
\]

Additional:

- ROC-AUC
- PR-AUC
- Confusion matrix
- Calibration

---

# 24. Early-Warning Evaluation

The system should evaluate whether predictions provide useful lead time.

Important metrics may include:

### Lead Time

\[
LeadTime = T_{outbreak} - T_{warning}
\]

Where:

- \(T_{outbreak}\) = observed outbreak time
- \(T_{warning}\) = warning generation time

Other metrics:

- Warning precision
- Warning recall
- False alarm rate
- Average warning lead time

---

# 25. Prediction Pipeline

The inference pipeline should be:

```text
API Request
    ↓
Schema Validation
    ↓
Feature Transformation
    ↓
Preprocessing Pipeline
    ↓
ML Model
    ↓
Probability
    ↓
Risk Classification
    ↓
Explainability
    ↓
Database
    ↓
API Response
```

---

# 26. Prediction Service

The prediction service should expose a clean internal interface.

Conceptually:

```python
prediction = model_service.predict(features)
```

Returned object:

```json
{
  "probability": 0.81,
  "risk_level": "HIGH",
  "model_version": "v1.0"
}
```

---

# 27. Risk Engine

The Risk Engine converts prediction probability into a risk category.

```text
Probability
     │
     ▼
Threshold Engine
     │
     ├── < T1 → LOW
     ├── < T2 → MODERATE
     ├── < T3 → HIGH
     └── ≥ T3 → CRITICAL
```

Thresholds must be configurable.

---

# 28. Calibration

If the model outputs probabilities, probability calibration should be evaluated.

Possible methods:

- Platt scaling
- Isotonic regression

The objective is to ensure that predicted probabilities reasonably correspond to observed frequencies.

---

# 29. Explainability Architecture

```text
Model
  │
  ▼
Prediction
  │
  ▼
SHAP / Feature Importance
  │
  ▼
Top Contributing Features
  │
  ▼
Human-Readable Explanation
```

Example output:

```json
{
  "top_factors": [
    {
      "feature": "humidity",
      "impact": "positive"
    },
    {
      "feature": "rainfall_7d",
      "impact": "positive"
    }
  ]
}
```

---

# 30. REST API

Base URL:

```text
/api/v1
```

---

## 30.1 Authentication

### Register

```http
POST /auth/register
```

### Login

```http
POST /auth/login
```

### Current User

```http
GET /auth/me
```

---

# 31. Prediction APIs

### Create Prediction

```http
POST /predictions
```

### Get Prediction

```http
GET /predictions/{prediction_id}
```

### List Predictions

```http
GET /predictions
```

### Location Risk

```http
GET /risk/{location_id}
```

---

# 32. Alert APIs

### List Alerts

```http
GET /alerts
```

### Get Alert

```http
GET /alerts/{alert_id}
```

### Mark Alert Read

```http
PATCH /alerts/{alert_id}
```

---

# 33. Analytics APIs

```http
GET /analytics/risk-trends
GET /analytics/pest-trends
GET /analytics/regional-risk
GET /analytics/model-performance
```

---

# 34. Dataset APIs

Admin/researcher access:

```http
POST /datasets
GET /datasets
GET /datasets/{dataset_id}
POST /datasets/{dataset_id}/validate
```

---

# 35. Model APIs

```http
GET /models
GET /models/{model_id}
POST /models
POST /models/{model_id}/deploy
POST /models/{model_id}/rollback
```

Model deployment endpoints must be protected by authorization.

---

# 36. API Response Standard

Successful response:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid humidity value."
  }
}
```

---

# 37. HTTP Status Codes

| Code | Meaning |
|---:|---|
| 200 | Success |
| 201 | Created |
| 400 | Invalid request |
| 401 | Unauthenticated |
| 403 | Unauthorized |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Validation error |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | Service unavailable |

---

# 38. Database Architecture

```text
users
 │
 ├── fields
 │      │
 │      └── crops
 │
 ├── predictions
 │      │
 │      └── alerts
 │
 └── observations

locations
 │
 ├── environmental_data
 ├── observations
 └── predictions

models
 │
 └── model_metrics
```

---

# 39. Database Tables

## users

```sql
id
name
email
password_hash
role
location_id
created_at
updated_at
```

## locations

```sql
id
name
district
state
country
latitude
longitude
created_at
```

## crops

```sql
id
name
variety
description
created_at
```

## pests

```sql
id
name
scientific_name
description
created_at
```

## environmental_data

```sql
id
location_id
timestamp
temperature
humidity
rainfall
soil_moisture
created_at
```

## observations

```sql
id
location_id
crop_id
pest_id
observation_date
presence
severity
count
source
created_at
```

## predictions

```sql
id
location_id
crop_id
pest_id
risk_score
risk_level
model_id
input_snapshot
created_at
```

## alerts

```sql
id
prediction_id
user_id
severity
title
message
status
created_at
read_at
```

## models

```sql
id
name
version
algorithm
artifact_path
feature_schema
status
created_at
```

## model_metrics

```sql
id
model_id
accuracy
precision
recall
f1
roc_auc
pr_auc
created_at
```

---

# 40. Database Constraints

The database should enforce:

- Unique email addresses.
- Valid foreign keys.
- Required fields.
- Valid risk levels.
- Valid user roles.
- Timestamp consistency.
- Referential integrity.

---

# 41. Authentication Architecture

Recommended flow:

```text
User
 │
 ▼
Login
 │
 ▼
Authentication Service
 │
 ▼
JWT / Session
 │
 ▼
Protected API
```

Passwords must never be stored in plaintext.

Recommended password hashing:

- Argon2
- bcrypt

---

# 42. Authorization

Role-based access control:

```text
ADMIN
 ├── Users
 ├── Datasets
 ├── Models
 └── System Configuration

RESEARCHER
 ├── Datasets
 ├── Experiments
 └── Model Metrics

OFFICER
 ├── Regional Risk
 ├── Alerts
 └── Analytics

FARMER
 ├── Own Fields
 ├── Predictions
 └── Alerts
```

---

# 43. Frontend Architecture

Recommended structure:

```text
frontend/
│
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── predictions/
│   ├── alerts/
│   ├── analytics/
│   └── settings/
│
├── components/
│   ├── charts/
│   ├── maps/
│   ├── cards/
│   └── forms/
│
├── services/
│   └── api.ts
│
├── hooks/
│
├── types/
│
└── utils/
```

---

# 44. Dashboard Technical Components

The dashboard should contain:

### Risk Summary

```text
Current Risk
Risk Score
Crop
Location
```

### Environmental Conditions

```text
Temperature
Humidity
Rainfall
Soil Moisture
```

### Risk Factors

```text
Feature Importance
```

### Trends

```text
7-day
30-day
Seasonal
```

### Alerts

```text
Active
Acknowledged
Resolved
```

---

# 45. Visualization Requirements

Charts must:

- Have readable labels.
- Display units.
- Support appropriate time ranges.
- Handle missing values.
- Clearly differentiate risk levels.
- Provide tooltips.
- Avoid misleading scales.

Potential visualizations:

- Line charts
- Bar charts
- Heatmaps
- Scatter plots
- Risk maps

---

# 46. Geographic Visualization

The frontend can use:

**Leaflet / MapLibre**

The backend should return:

```json
{
  "location": "Example Region",
  "latitude": 28.61,
  "longitude": 77.20,
  "risk_score": 0.81,
  "risk_level": "HIGH"
}
```

The frontend maps risk data to geographic markers.

---

# 47. External Data Integration

Future external sources may include:

```text
Weather APIs
Agricultural APIs
Satellite APIs
IoT Gateways
Government Agricultural Data
```

External integrations should be isolated behind service adapters.

```text
External API
     ↓
Adapter
     ↓
Normalization
     ↓
Internal Data Schema
```

This prevents external API changes from affecting the entire system.

---

# 48. Background Processing

If real-time or large-scale data ingestion is introduced, background jobs may be required.

Potential technologies:

- Celery
- Redis
- Cron
- Scheduled cloud jobs

Example:

```text
Weather API
     ↓
Scheduled Job
     ↓
Data Validation
     ↓
Database
     ↓
Prediction
     ↓
Alert
```

The MVP can initially perform predictions synchronously.

---

# 49. Caching

Caching may be introduced for:

- Frequently requested risk data
- Dashboard analytics
- Regional statistics
- External weather responses

Potential technology:

**Redis**

Caching should not compromise prediction freshness.

---

# 50. Logging

The backend should generate structured logs for:

- Authentication
- API requests
- Prediction requests
- Model errors
- External API errors
- Database errors
- Alert generation

Example:

```json
{
  "timestamp": "2026-09-24T10:30:00Z",
  "service": "prediction",
  "model_version": "v1.0",
  "status": "success"
}
```

---

# 51. Monitoring

Production monitoring should track:

### System Metrics

- CPU
- Memory
- API latency
- Error rate
- Database connections

### ML Metrics

- Prediction distribution
- Class distribution
- Drift indicators
- Model performance
- False-positive rate
- False-negative rate

---

# 52. Model Drift

The system should eventually monitor whether incoming data differs significantly from training data.

Potential indicators:

- Feature distribution changes
- Prediction distribution changes
- Performance degradation

Possible response:

```text
Drift Detected
     ↓
Model Evaluation
     ↓
Retraining Decision
     ↓
New Model
     ↓
Validation
     ↓
Deployment
```

---

# 53. Model Registry

Each model artifact should be associated with:

```text
Model Name
Version
Algorithm
Training Dataset
Feature Version
Metrics
Created Date
Deployment Status
Artifact Location
```

Example:

```text
PestRisk-XGBoost-v1.0
Status: Production
F1: XX
Recall: XX
Training Dataset: Dataset-v1
```

---

# 54. Deployment Architecture

Recommended deployment:

```text
                   Internet
                       │
                       ▼
                ┌────────────┐
                │   CDN /    │
                │ Reverse    │
                │   Proxy    │
                └─────┬──────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   ┌─────────────┐         ┌──────────────┐
   │  Frontend   │         │   Backend    │
   │  Next.js    │         │   FastAPI    │
   └─────────────┘         └──────┬───────┘
                                  │
                     ┌────────────┼────────────┐
                     ▼            ▼            ▼
                PostgreSQL      ML Model     Redis
```

---

# 55. Containerization

Docker should be used to ensure reproducibility.

Possible containers:

```text
frontend
backend
postgres
redis
ml-service
```

For MVP:

```text
frontend
backend + ML
postgres
```

may be sufficient.

---

# 56. Environment Configuration

Environment variables should be used for secrets and configuration.

Example:

```env
DATABASE_URL=
JWT_SECRET=
MODEL_PATH=
WEATHER_API_KEY=
REDIS_URL=
```

Secrets must never be committed to Git.

---

# 57. CI/CD

A recommended pipeline:

```text
Git Push
   ↓
CI
   ├── Lint
   ├── Unit Tests
   ├── Build
   └── Security Checks
   ↓
Deployment
   ↓
Production
```

Potential tools:

- GitHub Actions
- Docker
- Cloud deployment platform

---

# 58. Testing Requirements

## Unit Tests

Minimum coverage for:

- Preprocessing
- Feature engineering
- Risk scoring
- API validation
- Authentication
- Database services

## Integration Tests

Test:

```text
API → Database
API → ML Model
API → Alert Engine
Frontend → API
```

## End-to-End Tests

Test complete user journeys.

---

# 59. ML Testing

The ML pipeline must test for:

### Data Leakage

No future information should enter training features.

### Feature Consistency

Training and inference features must have identical definitions.

### Reproducibility

Training with the same configuration should produce reproducible results where practical.

### Generalization

Evaluate on unseen data.

---

# 60. Performance Requirements

Initial target requirements:

| Component | Target |
|---|---:|
| API health response | < 500 ms |
| Standard database query | < 500 ms |
| Prediction inference | < 2 s |
| Dashboard initial API calls | < 3 s |
| Error rate | < 1% under normal operation |

These are engineering targets for the MVP and should be benchmarked against the actual deployment environment.

---

# 61. Scalability Requirements

The architecture should support horizontal scaling.

```text
                 Load Balancer
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       API-1       API-2       API-3
          │           │           │
          └───────────┼───────────┘
                      ▼
                  PostgreSQL
```

The ML inference service should also be independently scalable if prediction volume increases.

---

# 62. Security Requirements

The system must implement:

- HTTPS
- Secure password hashing
- Authentication
- RBAC
- Input validation
- SQL injection protection
- CORS configuration
- Rate limiting
- Secure secret management
- Audit logging

---

# 63. Privacy Requirements

The system should minimize collection of personally identifiable information.

Agricultural location data should be handled carefully because detailed field-level information may be sensitive.

The system should:

- Collect only necessary information.
- Restrict access based on role.
- Avoid exposing private farm information publicly.
- Secure stored data.
- Provide appropriate data retention policies.

---

# 64. Failure Scenarios

## ML Model Unavailable

Return:

```text
503 MODEL_UNAVAILABLE
```

The system should not fabricate a prediction.

## Database Unavailable

Return:

```text
503 DATABASE_UNAVAILABLE
```

## External Weather API Failure

Use cached data if available or clearly indicate that current external data is unavailable.

## Invalid Input

Return:

```text
422 VALIDATION_ERROR
```

---

# 65. Observability

The system should maintain:

```text
Logs
Metrics
Error Tracking
Model Monitoring
Prediction Monitoring
```

The objective is to make system failures and model degradation detectable.

---

# 66. Repository Structure

Recommended:

```text
intelligent-pest-outbreak/
│
├── README.md
├── Overview.md
├── PRD.md
├── TRD.md
├── LICENSE
├── .gitignore
├── docker-compose.yml
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── external/
│
├── ml/
│   ├── notebooks/
│   ├── preprocessing/
│   ├── features/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── models/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── main.py
│   │
│   └── tests/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── utils/
│
├── infrastructure/
│   ├── docker/
│   └── deployment/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── experiments/
│
└── scripts/
```

---

# 67. Configuration Management

Configuration should be separated from application code.

Example:

```text
config/
├── development
├── testing
└── production
```

Environment-specific values should be injected through environment variables.

---

# 68. Development Workflow

Recommended development flow:

```text
Requirement
    ↓
Implementation
    ↓
Unit Test
    ↓
Integration Test
    ↓
Code Review
    ↓
Merge
    ↓
CI
    ↓
Deployment
```

---

# 69. Technical Milestones

## Milestone 1 — Data

- Dataset selected
- Data schema finalized
- Data cleaning completed
- EDA completed

## Milestone 2 — ML

- Baseline trained
- Candidate models trained
- Evaluation completed
- Final model selected

## Milestone 3 — Backend

- Database implemented
- API implemented
- Prediction service integrated
- Authentication implemented

## Milestone 4 — Frontend

- Dashboard
- Prediction UI
- Alerts
- Analytics

## Milestone 5 — Integration

- Frontend connected to backend
- ML inference integrated
- End-to-end workflow tested

## Milestone 6 — Deployment

- Dockerization
- CI/CD
- Production deployment
- Monitoring

---

# 70. Acceptance Criteria

The technical implementation will be considered complete when:

### Data

- Dataset can be loaded.
- Validation succeeds.
- Preprocessing is reproducible.

### ML

- At least one baseline model is evaluated.
- Multiple candidate models are compared.
- Final model has documented metrics.
- Test data remains unseen during training.

### Backend

- APIs are functional.
- Authentication works.
- Database persistence works.
- Prediction endpoint returns valid results.

### Frontend

- User can access dashboard.
- User can submit prediction inputs.
- Prediction result is displayed.
- Risk level is visible.
- Alerts are visible.

### System

- End-to-end prediction works.
- Errors are handled.
- Logs are available.
- Secrets are not committed.
- Documentation is complete.

---

# 71. Technical Definition of Done

The project is technically complete when the following workflow works successfully:

```text
User
 ↓
Login
 ↓
Select Crop + Location
 ↓
Enter / Retrieve Environmental Data
 ↓
Submit Prediction
 ↓
API Validation
 ↓
Feature Engineering
 ↓
ML Inference
 ↓
Risk Score
 ↓
Risk Classification
 ↓
Explainability
 ↓
Store Prediction
 ↓
Generate Alert if Required
 ↓
Display Result on Dashboard
```

---

# 72. Future Technical Extensions

The architecture should remain extensible for:

## IoT

```text
Sensors
 ↓
IoT Gateway
 ↓
Data Ingestion
 ↓
Prediction
```

## Satellite

```text
Satellite Imagery
 ↓
Image Processing
 ↓
Computer Vision
 ↓
Crop/Pest Indicators
 ↓
Risk Model
```

## Computer Vision

```text
Crop Image
 ↓
Vision Model
 ↓
Pest/Damage Detection
 ↓
Risk Fusion
```

## Real-Time Weather

```text
Weather API
 ↓
Scheduled Ingestion
 ↓
Feature Pipeline
 ↓
Prediction
 ↓
Alert
```

---

# 73. Long-Term Architecture

The long-term system can evolve into a multimodal agricultural intelligence platform:

```text
                 ┌───────────────┐
                 │ Weather Data  │
                 └───────┬───────┘
                         │
┌───────────────┐        │        ┌───────────────┐
│ IoT Sensors   │────────┼────────│ Satellite     │
└───────────────┘        │        └───────────────┘
                         ▼
                ┌─────────────────┐
                │ Data Platform   │
                └────────┬────────┘
                         ▼
              ┌──────────────────────┐
              │ Feature Engineering  │
              └──────────┬───────────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Tabular      Vision      Temporal
             │           │           │
             └───────────┼───────────┘
                         ▼
                ┌─────────────────┐
                │ Risk Prediction │
                │     Engine      │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Early Warning   │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Decision Support│
                └─────────────────┘
```

---

# 74. Final Technical Specification

The initial implementation should prioritize a **reliable, reproducible, modular ML prediction pipeline** over unnecessary system complexity.

The recommended MVP architecture is:

```text
Next.js / React
       │
       ▼
    FastAPI
       │
 ┌─────┼─────────────┐
 ▼     ▼             ▼
ML   PostgreSQL    Alerts
 │
 ▼
Risk Engine
 │
 ▼
Explainability
```

The system should establish a complete technical path from:

> **Data → Features → Machine Learning → Prediction → Risk → Early Warning → Dashboard**

while maintaining clear separation between the data, ML, backend, and presentation layers.

The architecture must also remain extensible enough to incorporate real-time weather, IoT, satellite imagery, computer vision, geospatial analytics, and multi-crop/multi-pest prediction in future versions.