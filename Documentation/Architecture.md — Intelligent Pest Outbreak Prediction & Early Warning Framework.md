# System Architecture

# Intelligent Pest Outbreak Prediction & Early Warning Framework

**Version:** 1.0  
**Status:** Architecture Specification  
**Project Type:** Major Academic Project  
**Domain:** Artificial Intelligence + AgriTech  
**Mentor:** Dr. Swati Vashisht

---

# 1. Architecture Overview

The **Intelligent Pest Outbreak Prediction & Early Warning Framework** follows a modular, layered architecture that separates:

- User interface
- API and authentication
- Business logic
- Machine learning
- Data processing
- Database
- External data sources
- Alerting
- Monitoring

The architecture is designed around the following principle:

> **Collect → Process → Understand → Predict → Assess Risk → Warn → Inform**

High-level architecture:

```text
                         ┌──────────────────────┐
                         │        USERS         │
                         │                      │
                         │ Farmers              │
                         │ Agricultural Officers│
                         │ Researchers          │
                         │ Administrators       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   PRESENTATION       │
                         │                      │
                         │ Web Dashboard        │
                         │ Risk Visualization   │
                         │ Alerts               │
                         │ Analytics             │
                         └──────────┬───────────┘
                                    │ HTTPS
                                    ▼
                         ┌──────────────────────┐
                         │      API LAYER       │
                         │       FastAPI        │
                         │                      │
                         │ Authentication       │
                         │ Validation           │
                         │ Routing              │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ Prediction   │  │ Alert        │  │ Analytics    │
          │ Service      │  │ Service      │  │ Service      │
          └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                 │                 │                 │
                 └─────────────────┼─────────────────┘
                                   │
                                   ▼
                         ┌──────────────────────┐
                         │    DATA LAYER       │
                         │                      │
                         │ PostgreSQL           │
                         │ Object Storage       │
                         │ Redis (Optional)     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   ML INFERENCE       │
                         │      ENGINE          │
                         │                      │
                         │ Preprocessing        │
                         │ Feature Engineering  │
                         │ Model                │
                         │ Risk Classification  │
                         │ Explainability       │
                         └──────────────────────┘
```

---

# 2. Architectural Goals

The architecture is designed to achieve:

### Modularity

Each major system responsibility should be independently maintainable.

### Scalability

The system should support increasing:

- Users
- Predictions
- Locations
- Crops
- Pest types
- Environmental observations

### Reproducibility

The same dataset and configuration should produce a reproducible ML pipeline.

### Extensibility

New data sources and models should be addable without redesigning the entire platform.

### Reliability

Failures in external services or individual components should not cause uncontrolled system failure.

### Explainability

The architecture should support understanding why the ML system generated a particular prediction.

---

# 3. Architectural Style

The MVP uses a **modular layered architecture** with service-oriented boundaries.

It is intentionally **not a full microservices architecture** for the initial academic implementation.

Recommended MVP:

```text
Frontend
   │
   ▼
FastAPI Backend
   │
   ├── Authentication
   ├── Prediction
   ├── Risk
   ├── Alerts
   └── Analytics
          │
          ▼
      PostgreSQL
          │
          ▼
       ML Engine
```

As system scale increases, individual services can be extracted.

---

# 4. Architectural Layers

The system consists of seven logical layers.

```text
┌──────────────────────────────────┐
│ 1. Presentation Layer            │
├──────────────────────────────────┤
│ 2. API Layer                     │
├──────────────────────────────────┤
│ 3. Application / Domain Layer    │
├──────────────────────────────────┤
│ 4. ML / Intelligence Layer       │
├──────────────────────────────────┤
│ 5. Data Processing Layer         │
├──────────────────────────────────┤
│ 6. Persistence Layer             │
├──────────────────────────────────┤
│ 7. External Integration Layer    │
└──────────────────────────────────┘
```

---

# 5. Presentation Layer

## Responsibility

The presentation layer provides the user-facing interface.

### Technology

Recommended:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Leaflet / MapLibre

### Main Interfaces

```text
/login
/register
/dashboard
/predictions
/alerts
/analytics
/fields
/settings
```

---

# 6. Dashboard Architecture

The dashboard aggregates data from multiple backend endpoints.

```text
                     Dashboard
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
 Risk Summary        Alerts API       Analytics API
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ▼
                     UI State
                         │
                         ▼
                    Visualization
```

Dashboard components:

- Current risk
- Risk score
- Environmental conditions
- Risk factors
- Active alerts
- Historical trends
- Regional risk
- Prediction history

---

# 7. API Layer

The API layer acts as the main gateway between the frontend and backend.

### Technology

**FastAPI**

Responsibilities:

- Routing
- Authentication
- Authorization
- Request validation
- Response serialization
- Rate limiting
- Error handling

Architecture:

```text
HTTP Request
     │
     ▼
API Router
     │
     ▼
Authentication
     │
     ▼
Validation
     │
     ▼
Application Service
     │
     ▼
Response
```

---

# 8. API Routing Structure

Recommended structure:

```text
/api/v1
│
├── /auth
│
├── /users
│
├── /crops
│
├── /pests
│
├── /locations
│
├── /environment
│
├── /predictions
│
├── /alerts
│
├── /analytics
│
├── /datasets
│
└── /models
```

---

# 9. Application Layer

The application layer contains business logic.

Recommended services:

```text
services/
│
├── auth_service.py
├── prediction_service.py
├── risk_service.py
├── alert_service.py
├── analytics_service.py
├── dataset_service.py
└── model_service.py
```

The API layer should not contain complex business logic.

Instead:

```text
API Router
    ↓
Service
    ↓
Repository / ML Engine
```

---

# 10. Prediction Service

The Prediction Service orchestrates the complete prediction workflow.

```text
Prediction Request
       │
       ▼
Validate Input
       │
       ▼
Load Model
       │
       ▼
Preprocess Features
       │
       ▼
Feature Engineering
       │
       ▼
Model Inference
       │
       ▼
Risk Calculation
       │
       ▼
Explainability
       │
       ▼
Store Prediction
       │
       ▼
Return Response
```

---

# 11. Risk Assessment Architecture

The risk engine is separated from the ML model.

This is important because the model produces a prediction/probability while the application determines how that output is communicated.

```text
ML Model
   │
   ▼
Probability
   │
   ▼
Risk Engine
   │
   ├── Thresholds
   ├── Risk Rules
   └── Configuration
   │
   ▼
Risk Level
```

Example:

```text
0.00 ───── 0.25 ───── 0.50 ───── 0.75 ───── 1.00
  │           │           │           │
 LOW      MODERATE       HIGH      CRITICAL
```

Thresholds should remain configurable.

---

# 12. Early-Warning Architecture

The early-warning system consumes risk events.

```text
Prediction
    │
    ▼
Risk Assessment
    │
    ▼
Risk >= Threshold?
    │
 ┌──┴───┐
 │      │
 NO     YES
 │      │
 ▼      ▼
Store   Generate Alert
        │
        ▼
    Notification
```

The MVP may initially use dashboard alerts.

Future notification channels:

- Email
- SMS
- Push notification
- Mobile application

---

# 13. Alert Service

The Alert Service is responsible for:

- Creating alerts
- Storing alerts
- Managing alert state
- Sending notifications
- Preventing duplicate alerts

Possible states:

```text
ACTIVE
ACKNOWLEDGED
RESOLVED
EXPIRED
```

---

# 14. Machine Learning Architecture

The ML subsystem is divided into two major environments:

```text
Training Environment
        │
        ▼
   Model Artifact
        │
        ▼
Inference Environment
```

---

# 15. ML Training Architecture

```text
                    Raw Dataset
                         │
                         ▼
                 Data Validation
                         │
                         ▼
                 Preprocessing
                         │
                         ▼
              Feature Engineering
                         │
                         ▼
                Dataset Splitting
                         │
                         ▼
                Model Training
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        Logistic     Random      XGBoost
        Regression   Forest
             │           │           │
             └───────────┼───────────┘
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

# 16. ML Inference Architecture

The production inference path should be lightweight.

```text
API
 │
 ▼
Prediction Service
 │
 ▼
Input Validation
 │
 ▼
Feature Pipeline
 │
 ▼
Trained Model
 │
 ▼
Prediction Probability
 │
 ▼
Risk Engine
 │
 ▼
Explanation
 │
 ▼
Response
```

---

# 17. Model Artifact

Each deployed model should contain:

```text
model/
├── model.pkl / model.joblib
├── preprocessing.pkl
├── feature_schema.json
├── metadata.json
└── metrics.json
```

Metadata:

```json
{
  "model_name": "PestRisk-XGBoost",
  "version": "1.0",
  "features": [],
  "training_dataset": "dataset-v1",
  "created_at": "2026-09-24"
}
```

---

# 18. Feature Pipeline

The same feature transformation logic must be used during training and inference.

```text
Raw Input
    │
    ▼
Validation
    │
    ▼
Cleaning
    │
    ▼
Encoding
    │
    ▼
Scaling
    │
    ▼
Derived Features
    │
    ▼
Final Feature Vector
```

This reduces the risk of training-serving skew.

---

# 19. Feature Schema

Example:

```json
{
  "temperature": "float",
  "humidity": "float",
  "rainfall_7d": "float",
  "soil_moisture": "float",
  "crop_type": "categorical",
  "crop_stage": "categorical",
  "season": "categorical"
}
```

The feature schema should be versioned alongside the model.

---

# 20. Explainability Architecture

The system should support model explanation where appropriate.

```text
Prediction
    │
    ▼
Explainability Engine
    │
    ├── SHAP
    ├── Feature Importance
    └── Local Explanation
    │
    ▼
Top Contributing Features
    │
    ▼
Human-Readable Explanation
```

Example:

```text
Risk: HIGH

Major contributing factors:

Humidity       → Strong contribution
Rainfall       → Moderate contribution
Temperature    → Moderate contribution
Crop Stage     → Low contribution
```

---

# 21. Data Architecture

The data system consists of three conceptual zones:

```text
┌──────────────────┐
│ Raw Data         │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Processed Data   │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Feature Dataset  │
└──────────────────┘
```

---

# 22. Data Sources

Potential sources:

### Historical Datasets

- Pest occurrence
- Crop data
- Environmental observations

### Weather

- Temperature
- Humidity
- Rainfall

### Soil

- Soil moisture
- Soil temperature

### Geographic

- Latitude
- Longitude
- Administrative boundaries

### Future

- IoT sensors
- Satellite imagery
- Government agricultural feeds

---

# 23. Data Ingestion Architecture

```text
                 External Sources
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    CSV Upload     Weather API     IoT Data
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                Data Ingestion
                       │
                       ▼
                 Data Validation
                       │
                       ▼
                  Normalization
                       │
                       ▼
                    Storage
```

---

# 24. PostgreSQL Architecture

PostgreSQL stores transactional and structured application data.

Main tables:

```text
users
locations
crops
pests
fields
environmental_data
observations
predictions
alerts
models
model_metrics
```

Relationships:

```text
User
 │
 └── Field
      │
      └── Crop

Location
 ├── Environmental Data
 ├── Observations
 └── Predictions

Prediction
 └── Alert

Model
 └── Model Metrics
```

---

# 25. Repository Layer

The backend should isolate database access from business logic.

```text
Service
   │
   ▼
Repository
   │
   ▼
SQLAlchemy
   │
   ▼
PostgreSQL
```

Example:

```text
prediction_service
       │
       ▼
prediction_repository
       │
       ▼
PostgreSQL
```

This makes database implementation easier to change later.

---

# 26. External Integration Architecture

External services should use adapters.

```text
Weather Provider
       │
       ▼
Weather Adapter
       │
       ▼
Internal Weather Schema
       │
       ▼
Data Processing
```

This prevents external APIs from becoming tightly coupled to application logic.

---

# 27. Weather Integration

Future architecture:

```text
Scheduler
    │
    ▼
Weather API
    │
    ▼
Weather Adapter
    │
    ▼
Validation
    │
    ▼
PostgreSQL
    │
    ▼
Feature Pipeline
    │
    ▼
Prediction
```

---

# 28. IoT Integration

Future IoT architecture:

```text
Field Sensors
     │
     ▼
IoT Gateway
     │
     ▼
MQTT / HTTP
     │
     ▼
Data Ingestion Service
     │
     ▼
Validation
     │
     ▼
Database
     │
     ▼
ML Pipeline
```

Potential sensors:

- Temperature
- Humidity
- Soil moisture
- Soil temperature

---

# 29. Satellite / Computer Vision Extension

The architecture should eventually support image-based intelligence.

```text
Satellite / Field Image
          │
          ▼
     Image Storage
          │
          ▼
    Image Processing
          │
          ▼
    Vision Model
          │
          ▼
Crop/Pest Indicators
          │
          ▼
   Risk Fusion Layer
          │
          ▼
Final Risk Prediction
```

---

# 30. Multimodal Risk Architecture

Long-term architecture can combine multiple models.

```text
             Environmental Model
                      │
                      ▼
                 ┌─────────┐
                 │         │
Vision Model ───►│  Fusion │◄── Temporal Model
                 │  Layer  │
                 └────┬────┘
                      │
                      ▼
                Risk Prediction
                      │
                      ▼
                 Early Warning
```

This enables the framework to combine:

- Tabular environmental data
- Images
- Time-series information
- Geographic context

---

# 31. Geographic Architecture

For location-aware predictions:

```text
Location
   │
   ├── Coordinates
   ├── Region
   ├── District
   └── State
          │
          ▼
      Risk Engine
          │
          ▼
     Regional Risk
          │
          ▼
       Map Layer
```

PostGIS can be introduced when advanced spatial queries become necessary.

---

# 32. Caching Architecture

Redis can optionally be introduced.

```text
Frontend
   │
   ▼
API
   │
   ▼
Redis Cache
   │
   ├── HIT → Return Cached Data
   │
   └── MISS
         ↓
      PostgreSQL
```

Good candidates:

- Regional risk
- Dashboard summaries
- Weather responses
- Frequently requested analytics

Predictions requiring fresh data should not use stale cached values.

---

# 33. Background Job Architecture

For periodic data processing:

```text
Scheduler
    │
    ▼
Job Queue
    │
    ▼
Worker
    │
    ├── Fetch Weather
    ├── Process Data
    ├── Generate Prediction
    └── Generate Alert
```

Potential technologies:

- Celery
- Redis
- Scheduled cloud jobs

---

# 34. Authentication Architecture

```text
User
 │
 ▼
Login
 │
 ▼
Auth Service
 │
 ▼
Credential Verification
 │
 ▼
JWT / Session
 │
 ▼
Protected API
```

Passwords must be hashed using a secure password-hashing algorithm.

---

# 35. Authorization Architecture

Role-based access control:

```text
                    USER
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Farmer     Officer    Researcher
          │          │          │
          └──────────┼──────────┘
                     ▼
                   Admin
```

Permissions should be checked at the API/service layer rather than relying solely on frontend restrictions.

---

# 36. Security Architecture

Security boundaries:

```text
Internet
   │
   ▼
HTTPS
   │
   ▼
Reverse Proxy
   │
   ▼
API Authentication
   │
   ▼
Authorization
   │
   ▼
Application
   │
   ▼
Database
```

Required controls:

- HTTPS
- Password hashing
- JWT/session security
- RBAC
- Input validation
- SQL injection prevention
- Rate limiting
- Secure environment variables
- CORS configuration

---

# 37. Deployment Architecture

Recommended initial deployment:

```text
                    Internet
                       │
                       ▼
                 ┌───────────┐
                 │ Frontend  │
                 │ Next.js   │
                 └─────┬─────┘
                       │
                       ▼
                 ┌───────────┐
                 │ Backend   │
                 │ FastAPI   │
                 └─────┬─────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
        PostgreSQL   ML Model   Redis
```

---

# 38. Container Architecture

Docker can package each major component.

```text
Docker Environment
│
├── frontend
│
├── backend
│
├── postgres
│
├── redis
│
└── ml-service (optional)
```

For the MVP, the ML inference engine may run inside the backend container.

---

# 39. Production Architecture

As the project grows:

```text
                        Internet
                           │
                           ▼
                    Load Balancer
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Frontend          API-1            API-2
                           │                │
                           └───────┬────────┘
                                   ▼
                              ML Service
                                   │
                 ┌─────────────────┼────────────────┐
                 ▼                 ▼                ▼
            PostgreSQL           Redis       Object Storage
```

---

# 40. Object Storage

Large files should not be stored directly in PostgreSQL.

Object storage can contain:

- Raw datasets
- Processed datasets
- Model artifacts
- Satellite images
- Training outputs

Architecture:

```text
Application
    │
    ▼
Object Storage
    │
    ├── datasets/
    ├── models/
    ├── images/
    └── experiments/
```

---

# 41. Model Deployment

Model deployment should follow:

```text
Train
  ↓
Evaluate
  ↓
Register
  ↓
Validate
  ↓
Deploy
  ↓
Monitor
```

A model should not automatically become production just because training completed.

---

# 42. Model Rollback

If a new model performs poorly:

```text
Model v2
   │
   ▼
Production
   │
   ▼
Performance Issue
   │
   ▼
Rollback
   │
   ▼
Model v1
```

Model versions should therefore remain immutable after deployment.

---

# 43. Monitoring Architecture

System monitoring:

```text
Application
   │
   ├── Logs
   ├── Metrics
   └── Errors
          │
          ▼
     Monitoring
```

ML monitoring:

```text
Predictions
   │
   ├── Distribution
   ├── Confidence
   ├── Drift
   └── Performance
          │
          ▼
      ML Monitoring
```

---

# 44. Data Drift

Data drift occurs when incoming data distribution changes from training data.

Example:

```text
Training Temperature
20°C ───────── 32°C

Production
28°C ───────── 45°C
```

The system should eventually detect such distribution changes.

Possible actions:

```text
Drift
 ↓
Investigate
 ↓
Evaluate Model
 ↓
Retrain if necessary
```

---

# 45. Failure Isolation

Failures should remain localized.

Example:

```text
Weather API Failure
       │
       ▼
Weather Adapter
       │
       X
       │
       ▼
Use Cached / Existing Data
       │
       ▼
Continue Core Platform
```

The failure of an optional external integration should not necessarily bring down the entire prediction platform.

---

# 46. Data Flow — Prediction

Complete prediction data flow:

```text
User
 │
 ▼
Dashboard
 │
 ▼
POST /predictions
 │
 ▼
FastAPI
 │
 ▼
Pydantic Validation
 │
 ▼
Prediction Service
 │
 ▼
Feature Pipeline
 │
 ▼
ML Model
 │
 ▼
Probability
 │
 ▼
Risk Engine
 │
 ▼
Explainability
 │
 ▼
PostgreSQL
 │
 ▼
Alert Engine
 │
 ▼
API Response
 │
 ▼
Dashboard
```

---

# 47. Data Flow — Early Warning

```text
Environmental Data
        │
        ▼
Prediction Engine
        │
        ▼
Risk Score
        │
        ▼
Threshold Evaluation
        │
        ├── Normal
        │     ↓
        │   Store
        │
        └── High Risk
              ↓
          Create Alert
              ↓
          Notification
              ↓
             User
```

---

# 48. Data Flow — Training

```text
Dataset
  │
  ▼
Validation
  │
  ▼
Cleaning
  │
  ▼
Feature Engineering
  │
  ▼
Train / Validation / Test
  │
  ▼
Candidate Models
  │
  ▼
Evaluation
  │
  ▼
Best Validated Model
  │
  ▼
Model Registry
  │
  ▼
Deployment
```

---

# 49. Data Flow — Real-Time Future Version

```text
Sensors / Weather API
          │
          ▼
     Data Ingestion
          │
          ▼
      Message Queue
          │
          ▼
    Data Processing
          │
          ▼
     Feature Store
          │
          ▼
   Prediction Service
          │
          ▼
      Risk Engine
          │
          ▼
     Alert Engine
          │
          ▼
      User / Officer
```

---

# 50. Architectural Boundaries

The system should maintain the following boundaries:

### Frontend ↔ Backend

Communication only through documented APIs.

### Backend ↔ Database

Database access only through repositories/data-access layer.

### Backend ↔ ML

Prediction through a defined inference interface.

### ML ↔ Dataset

Training pipeline should not directly depend on production database internals.

### External APIs ↔ Application

External APIs should be accessed through adapters.

---

# 51. Dependency Direction

Recommended dependency direction:

```text
Presentation
     ↓
API
     ↓
Application Services
     ↓
Domain Logic
     ↓
Repositories
     ↓
Infrastructure
```

ML inference can be treated as an infrastructure/intelligence dependency exposed through a stable service interface.

The database should not contain business logic.

---

# 52. Modular Backend Structure

```text
backend/
│
└── app/
    │
    ├── api/
    │   ├── auth.py
    │   ├── predictions.py
    │   ├── alerts.py
    │   └── analytics.py
    │
    ├── services/
    │   ├── prediction.py
    │   ├── risk.py
    │   ├── alerts.py
    │   └── analytics.py
    │
    ├── repositories/
    │   ├── users.py
    │   ├── predictions.py
    │   └── alerts.py
    │
    ├── models/
    │
    ├── schemas/
    │
    ├── core/
    │
    └── main.py
```

---

# 53. ML Repository Structure

```text
ml/
│
├── data/
│   ├── ingestion/
│   └── validation/
│
├── preprocessing/
│
├── features/
│
├── training/
│
├── evaluation/
│
├── inference/
│
├── explainability/
│
├── models/
│
└── notebooks/
```

---

# 54. Configuration Architecture

Configuration should be externalized.

```text
Environment
     │
     ├── DATABASE_URL
     ├── MODEL_PATH
     ├── JWT_SECRET
     ├── REDIS_URL
     └── API_KEYS
```

Secrets must never be hard-coded.

---

# 55. API Versioning

APIs should use versioning:

```text
/api/v1/...
```

Future breaking changes can be introduced through:

```text
/api/v2/...
```

This avoids breaking existing clients.

---

# 56. Performance Architecture

The system should keep the synchronous prediction path short:

```text
Request
  ↓
Validation
  ↓
Feature Processing
  ↓
Inference
  ↓
Risk
  ↓
Response
```

Heavy tasks should move to background processing:

```text
Dataset Processing
Model Training
Large Analytics
Bulk Predictions
External Data Synchronization
```

---

# 57. Scalability Strategy

The MVP should scale vertically first.

As demand increases:

```text
Single Instance
      ↓
Multiple API Instances
      ↓
Load Balancer
      ↓
Dedicated ML Service
      ↓
Background Workers
      ↓
Distributed Data Infrastructure
```

---

# 58. Disaster Recovery

Important data should be backed up:

- PostgreSQL
- Model artifacts
- Datasets
- Configuration

Recovery architecture:

```text
Primary Database
       │
       ▼
Scheduled Backup
       │
       ▼
Backup Storage
```

---

# 59. Security Zones

```text
                 PUBLIC
                   │
                   ▼
             Reverse Proxy
                   │
              ─────┼─────
                   │
                PRIVATE
                   │
              API Services
                   │
              ─────┼─────
                   │
             Data Services
                   │
              PostgreSQL
```

Database services should not be directly exposed to the public internet.

---

# 60. Architecture Decision Records

Important architectural decisions should be documented.

Example:

### ADR-001 — PostgreSQL

**Decision:** Use PostgreSQL as the primary application database.

**Reason:** Structured relational data, strong consistency, and future geographic support.

### ADR-002 — FastAPI

**Decision:** Use FastAPI for backend APIs.

**Reason:** Native Python integration with the ML stack and strong request validation.

### ADR-003 — Modular Monolith for MVP

**Decision:** Start with a modular backend rather than microservices.

**Reason:** Lower operational complexity while maintaining clear service boundaries.

### ADR-004 — Separate Risk Engine

**Decision:** Keep risk classification separate from the ML model.

**Reason:** Allows thresholds and business rules to change without retraining the model.

---

# 61. Recommended MVP Architecture

For the first implementation, avoid unnecessary infrastructure.

```text
                 ┌─────────────────┐
                 │    Next.js      │
                 │    Frontend     │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    FastAPI      │
                 │     Backend     │
                 └────────┬────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          Prediction    Alerts     Analytics
              │
              ▼
        ┌──────────────┐
        │ ML Pipeline  │
        │ + Model      │
        └──────┬───────┘
               │
       ┌───────┴────────┐
       ▼                ▼
 PostgreSQL        Model Storage
```

This is sufficient to demonstrate the complete project without prematurely introducing distributed infrastructure.

---

# 62. Target Future Architecture

The mature architecture can evolve into:

```text
                         USERS
                           │
                           ▼
                    Web / Mobile
                           │
                           ▼
                     API Gateway
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
       ▼                   ▼                    ▼
 Prediction Service   Alert Service       Analytics
       │                   │                    │
       └───────────────┬───┴────────────────────┘
                       ▼
                Feature Platform
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Weather Data     IoT Data      Satellite Data
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                ML Intelligence
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Tabular    Vision    Temporal
           Model      Model      Model
             │         │         │
             └─────────┼─────────┘
                       ▼
                  Fusion Layer
                       │
                       ▼
                 Risk Engine
                       │
                       ▼
                Early Warning
```

---

# 63. Core Architectural Principle

The architecture should preserve the following separation:

```text
DATA
 ↓
PROCESSING
 ↓
FEATURES
 ↓
INTELLIGENCE
 ↓
RISK
 ↓
ALERT
 ↓
USER
```

No individual component should become responsible for the entire workflow.

---

# 64. Final Architecture Summary

The **Intelligent Pest Outbreak Prediction & Early Warning Framework** should begin as a modular, maintainable system with:

- **Next.js/React** for presentation
- **FastAPI** for backend APIs
- **PostgreSQL** for structured application data
- **Python ML stack** for prediction
- **Dedicated preprocessing/feature pipeline**
- **Independent risk assessment engine**
- **Alert service**
- **Explainability layer**
- **Optional Redis/background workers**
- **Docker-based deployment**

The MVP architecture prioritizes simplicity and reproducibility:

```text
                 ┌──────────────┐
                 │    USER      │
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │  DASHBOARD   │
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │   FASTAPI    │
                 └──────┬───────┘
                        ▼
             ┌──────────┼───────────┐
             ▼          ▼           ▼
        Prediction    Risk       Alerts
             │          │           │
             └──────────┼───────────┘
                        ▼
                 ┌──────────────┐
                 │ ML INFERENCE │
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │ PostgreSQL   │
                 └──────────────┘
```

The architecture is deliberately designed so that the system can evolve from an academic MVP into a larger agricultural intelligence platform without requiring a complete rewrite.