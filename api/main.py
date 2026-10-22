import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import joblib
import numpy as np
import pandas as pd

from src.config import (
    BASE_TEMPERATURES,
    ECONOMIC_THRESHOLD_LEVELS,
    RISK_LEVELS,
    PROCESSED_DATA_DIR,
    MODELS_DIR,
    BEST_MODEL_FILE,
    MODEL_COMPARISON_FILE,
    PREPROCESSOR_FILE,
)
from src.data.loader import load_reference_tables
from src.data.encoder import SurveillanceDataPreprocessor
from src.ml.explain import explain_single_prediction
from src.utils.weather import weather_service, STATION_COORDINATES
from src.utils.alerts import alert_service
from src.utils.database import db_service
from api.schemas import (
    PredictionRequest,
    PredictionResponse,
    ContributingFactor,
    HealthCheckResponse,
    AlertDispatchRequest,
    ScoutingReportRequest,
    ObservationCreate,
    ObservationUpdate,
    AlertCreate,
    AlertStatusUpdate,
)

app = FastAPI(
    title="Intelligent Pest Outbreak Prediction & Early Warning API",
    description="AgriTech AI service providing real-time bio-climatic pest outbreak predictions and early warnings.",
    version="2.0.0",
)

# Serve model artifacts (SHAP, confusion matrix, ROC images) as static files
_artifacts_dir = Path(__file__).resolve().parent.parent / "artifacts"
if _artifacts_dir.exists():
    app.mount("/artifacts", StaticFiles(directory=str(_artifacts_dir)), name="artifacts")

# Allow local frontend or mobile apps to query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------------------
# ML Asset Loading
# -------------------------------------------------------------------------

def load_ml_assets():
    model = None
    prep = None
    meta = {}

    if BEST_MODEL_FILE.exists():
        try:
            model = joblib.load(BEST_MODEL_FILE)
        except Exception:
            model = None

    if PREPROCESSOR_FILE.exists():
        try:
            prep = SurveillanceDataPreprocessor.load(PREPROCESSOR_FILE)
        except Exception:
            prep = None

    if MODEL_COMPARISON_FILE.exists():
        try:
            with open(MODEL_COMPARISON_FILE, "r") as f:
                meta = json.load(f)
        except Exception:
            meta = {}

    return model, prep, meta


champion_model, ml_preprocessor, model_benchmark_meta = load_ml_assets()


# -------------------------------------------------------------------------
# Root & Dashboard
# -------------------------------------------------------------------------

@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Intelligent Pest Outbreak Prediction & Early Warning Framework",
        "status": "online",
        "version": "2.0.0",
        "champion_model": model_benchmark_meta.get("champion_model", "Trained ML Model"),
        "dashboard_url": "/dashboard",
        "docs_url": "/docs",
    }


@app.get("/dashboard", response_class=HTMLResponse, tags=["Dashboard"])
def get_dashboard():
    """Serves the interactive Visual Dashboard UI."""
    dashboard_path = Path(__file__).parent / "dashboard.html"
    if dashboard_path.exists():
        return HTMLResponse(content=dashboard_path.read_text(), status_code=200)
    return HTMLResponse(content="<h1>Dashboard file not found</h1>", status_code=404)


# -------------------------------------------------------------------------
# Health & System Status
# -------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    processed_file = PROCESSED_DATA_DIR / "processed_surveillance.csv"
    exists = processed_file.exists()
    row_count = 0

    if exists:
        try:
            with open(processed_file, "r") as f:
                row_count = sum(1 for _ in f) - 1
        except Exception:
            row_count = 0

    active_alerts = db_service.get_active_alert_count()

    return HealthCheckResponse(
        status="healthy",
        version="2.0.0",
        datasets_ready=exists,
        total_surveillance_records=max(row_count, 0),
        active_alerts=active_alerts,
        model_loaded=(champion_model is not None),
        weather_service="Open-Meteo (Live)",
    )


# -------------------------------------------------------------------------
# Reference Data
# -------------------------------------------------------------------------

@app.get("/api/v1/reference/pests", tags=["Reference Data"])
def get_monitored_pests():
    """Lists pests with their physiological base temperatures and Economic Thresholds (ETL)."""
    pests = []
    all_keys = set(list(BASE_TEMPERATURES.keys()) + list(ECONOMIC_THRESHOLD_LEVELS.keys()))
    all_keys.discard("default")

    for pest in sorted(all_keys):
        pests.append({
            "pest_name": pest,
            "base_temperature_deg_c": BASE_TEMPERATURES.get(pest, 10.0),
            "economic_threshold_level": ECONOMIC_THRESHOLD_LEVELS.get(pest, 5.0),
        })

    return {"count": len(pests), "pests": pests}


@app.get("/api/v1/reference/advisories", tags=["Reference Data"])
def get_advisory_tables():
    """Returns official TNAU & IPM guidelines for in-field interventions."""
    try:
        tables = load_reference_tables()
        tnau_preview = tables["tnau_thresholds"].head(10).to_dict(orient="records")
        return {"tnau_guidelines": tnau_preview}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not load reference tables: {str(e)}",
        )


@app.get("/api/v1/stations", tags=["Reference Data"])
def get_stations():
    """Returns metadata for all 11 ICAR monitoring stations."""
    stations = []
    for name, coords in STATION_COORDINATES.items():
        stations.append({
            "name": name,
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "state": coords["state"],
        })
    return {"count": len(stations), "stations": stations}


# -------------------------------------------------------------------------
# Model Information & Evaluation
# -------------------------------------------------------------------------

@app.get("/api/v1/models/benchmark", tags=["Machine Learning"])
@app.get("/api/v1/model-info", tags=["Machine Learning"])
@app.get("/api/model-evaluation", tags=["Machine Learning"])
def get_model_benchmarks():
    """Returns comparative validation metrics across all trained ML models on holdout test seasons."""
    if not model_benchmark_meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model benchmark report not found. Run 'python3 -m src.ml.pipeline' first.",
        )
    return model_benchmark_meta


@app.get("/api/v1/models/benchmark/full", tags=["Machine Learning"])
def get_full_dataset_benchmark():
    """
    Returns champion model performance evaluated across the entire 35,499 records dataset.
    NOTE: Full-dataset metrics are NOT equivalent to temporal holdout generalization.
    """
    full_eval_file = MODELS_DIR / "full_dataset_evaluation.json"
    if not full_eval_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Full dataset evaluation not found.",
        )
    with open(full_eval_file, "r") as f:
        return json.load(f)


@app.get("/api/v1/models/auxiliary", tags=["Machine Learning"])
def get_auxiliary_models_metrics():
    """Returns performance reports for Multi-Pest Weather and Regional Severity models."""
    res = {}
    mp_file = MODELS_DIR / "multi_pest_weather_metrics.json"
    reg_file = MODELS_DIR / "regional_severity_metrics.json"

    if mp_file.exists():
        with open(mp_file, "r") as f:
            res["multi_pest_weather"] = json.load(f)
    if reg_file.exists():
        with open(reg_file, "r") as f:
            res["regional_severity"] = json.load(f)

    return res


@app.get("/api/model-comparison", tags=["Machine Learning"])
@app.get("/api/models/comparison", tags=["Machine Learning"], include_in_schema=False)
def get_model_comparison():
    """Returns the full model comparison table from verified evaluation artifacts."""
    if not model_benchmark_meta:
        raise HTTPException(status_code=404, detail="Model comparison artifact not found.")
    models = model_benchmark_meta.get("models", {})
    rows = []
    for name, m in models.items():
        rows.append({
            "model": name,
            "accuracy": m.get("accuracy", 0),
            "precision": m.get("precision", 0),
            "recall": m.get("recall", 0),
            "f1_score": m.get("f1_score", 0),
            "roc_auc": m.get("roc_auc", 0),
            "false_negative_rate": m.get("false_negative_rate", 0),
            "confusion_matrix": m.get("confusion_matrix", {}),
        })
    return {
        "champion": model_benchmark_meta.get("champion_model"),
        "selection_metric": model_benchmark_meta.get("selection_metric"),
        "temporal_test_split": "2007–2011 (holdout seasons)",
        "training_split": "Years ≤ 2006",
        "test_size": 8060,
        "train_size": 27439,
        "total_records": 35499,
        "models": rows,
    }


# -------------------------------------------------------------------------
# Predictions
# -------------------------------------------------------------------------

@app.post("/api/v1/predictions/evaluate", response_model=PredictionResponse, tags=["Predictions"])
@app.post("/api/predict", response_model=PredictionResponse, tags=["Predictions"])
def evaluate_risk(payload: PredictionRequest):
    """
    Evaluates micro-meteorological observations and field scouting data against the
    champion Machine Learning model and bio-climatic indices to compute an early-warning risk level.
    Forecast horizon: next-week outbreak occurrence (7 days).
    """
    w = payload.weather
    t_mean = (w.temp_max + w.temp_min) / 2.0
    t_base = BASE_TEMPERATURES.get(payload.pest_name, BASE_TEMPERATURES["default"])
    gdd = max(t_mean - t_base, 0.0)
    dtr = max(w.temp_max - w.temp_min, 0.0)
    rh_diff = w.rh_morning - w.rh_evening
    rh_mean = (w.rh_morning + w.rh_evening) / 2.0
    etl = ECONOMIC_THRESHOLD_LEVELS.get(payload.pest_name, ECONOMIC_THRESHOLD_LEVELS["default"])
    is_outbreak_now = int(payload.current_pest_count >= etl) if payload.current_pest_count else 0

    # Vapor pressure deficit approximation (Tetens formula)
    sat_vp = 0.61078 * np.exp((17.27 * t_mean) / (t_mean + 237.3))
    actual_vp = sat_vp * (rh_mean / 100.0)
    vpd_kpa = round(max(sat_vp - actual_vp, 0.0), 3)

    # Cyclical meteorological week encoding
    week_sin = round(np.sin(2 * np.pi * payload.standard_week / 52.0), 4)
    week_cos = round(np.cos(2 * np.pi * payload.standard_week / 52.0), 4)
    humidity_persist = int(w.rh_morning >= 85.0 and w.rh_evening >= 60.0)

    risk_factors: List[ContributingFactor] = []
    final_score = 0.50
    model_version_tag = "v1.0-rules-engine"

    # 1. Run Machine Learning Model Inference if available
    if champion_model is not None and ml_preprocessor is not None:
        try:
            input_dict = {
                "crop": payload.crop,
                "pest_name": payload.pest_name,
                "location": payload.location,
                "life_stage": "Adult",
                "collection_type": "Number/Light trap" if payload.crop.lower() == "rice" else "Number/ 3 leaves",
                "temp_max": w.temp_max,
                "temp_min": w.temp_min,
                "temp_mean": t_mean,
                "diurnal_temp_range": dtr,
                "rh_morning": w.rh_morning,
                "rh_evening": w.rh_evening,
                "rh_mean": rh_mean,
                "rh_differential": rh_diff,
                "high_humidity_persistence": humidity_persist,
                "rainfall": w.rainfall,
                "wind_speed": w.wind_speed or 3.0,
                "sunshine_hours": w.sunshine_hours or 7.0,
                "evaporation": w.evaporation or 3.0,
                "vpd_kpa": vpd_kpa,
                "gdd": gdd,
                "standard_week": payload.standard_week,
                "week_sin": week_sin,
                "week_cos": week_cos,
                "pest_count": payload.current_pest_count or 0.0,
                "outbreak_current": is_outbreak_now,
                "temp_mean_lag1": t_mean,
                "temp_mean_lag2": t_mean,
                "rh_mean_lag1": rh_mean,
                "rh_mean_lag2": rh_mean,
                "rainfall_lag1": w.rainfall,
                "rainfall_lag2": w.rainfall,
                "gdd_lag1": gdd,
                "gdd_lag2": gdd,
                "pest_count_lag1": payload.current_pest_count or 0.0,
                "pest_count_lag2": payload.current_pest_count or 0.0,
                "pest_velocity": 0.0,
                "pest_acceleration": 0.0,
                "temp_rh_interaction": round(t_mean * rh_mean, 2),
                "humid_heat_index": round(w.temp_max * (w.rh_morning / 100.0), 2),
                "cumulative_gdd_3w": round(gdd * 3.0, 2),
            }
            row_df = pd.DataFrame([input_dict])
            X_encoded = ml_preprocessor.transform(row_df, return_df=True)

            proba = float(champion_model.predict_proba(X_encoded)[0, 1])
            final_score = round(min(max(proba, 0.02), 0.99), 2)
            champ_name = model_benchmark_meta.get("champion_model", "Random Forest")
            model_version_tag = f"v2.0-ml-{champ_name.lower().replace(' ', '-')}"

            explanations = explain_single_prediction(
                champion_model,
                X_encoded,
                ml_preprocessor.feature_names_,
                top_k=4,
            )
            for exp in explanations:
                risk_factors.append(ContributingFactor(
                    feature=exp["feature"],
                    impact=exp["impact"],
                    description=exp["description"],
                ))
        except Exception:
            final_score = 0.50

    # 2. Heuristic fallback
    if not risk_factors:
        raw_score = 0.15
        if 24.0 <= t_mean <= 33.0:
            raw_score += 0.25
            risk_factors.append(ContributingFactor(
                feature="Mean Temperature",
                impact="Elevating (+25%)",
                description=f"Optimal reproductive temperature for {payload.pest_name} ({t_mean:.1f}°C)."
            ))
        if w.rh_morning >= 85.0:
            raw_score += 0.25
            risk_factors.append(ContributingFactor(
                feature="Canopy Humidity",
                impact="Elevating (+25%)",
                description=f"High morning humidity ({w.rh_morning:.1f}%) creates favorable micro-climate."
            ))
        if is_outbreak_now:
            raw_score += 0.35
            risk_factors.append(ContributingFactor(
                feature="Current Field Population",
                impact="High Threat (+35%)",
                description=f"Current count ({payload.current_pest_count}) is approaching/exceeding ETL ({etl})."
            ))
        final_score = round(min(max(raw_score, 0.05), 0.98), 2)

    # 3. Risk severity level
    if final_score < RISK_LEVELS["LOW"]["max"]:
        level = "LOW"
    elif final_score < RISK_LEVELS["MODERATE"]["max"]:
        level = "MODERATE"
    elif final_score < RISK_LEVELS["HIGH"]["max"]:
        level = "HIGH"
    else:
        level = "CRITICAL"

    advisory_action = RISK_LEVELS[level]["action"]
    full_advisory = (
        f"Status: {level}. {advisory_action}. "
        f"Target ETL threshold for {payload.pest_name} is {etl}. "
        f"Accumulated degree-days: {gdd:.1f} GDD. "
        f"VPD: {vpd_kpa:.2f} kPa. "
        f"Forecast horizon: next 7 days."
    )

    resp = PredictionResponse(
        crop=payload.crop,
        pest_name=payload.pest_name,
        location=payload.location,
        standard_week=payload.standard_week,
        risk_score=final_score,
        risk_level=level,
        is_warning=(final_score >= 0.60),
        gdd_accumulated=round(gdd, 2),
        rh_differential=round(rh_diff, 2),
        top_factors=risk_factors,
        advisory=full_advisory,
        model_version=model_version_tag,
    )

    # Persist prediction to audit trail
    try:
        pred_id = db_service.log_prediction_audit({
            "crop": payload.crop,
            "location": payload.location,
            "pest_name": payload.pest_name,
            "risk_score": final_score,
            "risk_level": level,
            "is_warning": resp.is_warning,
            "gdd_accumulated": resp.gdd_accumulated,
            "vpd_kpa": vpd_kpa,
            "top_factors": [f.model_dump() for f in risk_factors],
            "advisory": full_advisory,
            "model_version": model_version_tag,
        })
        # Auto-create alert for HIGH/CRITICAL predictions
        if level in ("HIGH", "CRITICAL") and resp.is_warning:
            explanation = "; ".join(f"{f.feature}: {f.impact}" for f in risk_factors[:2])
            db_service.create_alert({
                "severity": level,
                "location": payload.location,
                "pest_name": payload.pest_name,
                "crop": payload.crop,
                "risk_score": final_score,
                "predicted_horizon": "Next 7 days",
                "explanation_summary": explanation,
                "source_prediction_id": pred_id,
            })
    except Exception:
        pass

    return resp


@app.post("/api/explain", tags=["Predictions"])
def explain_prediction(payload: PredictionRequest):
    """Returns model-based SHAP feature attribution for a prediction request."""
    if champion_model is None or ml_preprocessor is None:
        raise HTTPException(status_code=503, detail="Model not available.")

    w = payload.weather
    t_mean = (w.temp_max + w.temp_min) / 2.0
    t_base = BASE_TEMPERATURES.get(payload.pest_name, BASE_TEMPERATURES["default"])
    gdd = max(t_mean - t_base, 0.0)
    rh_diff = w.rh_morning - w.rh_evening
    rh_mean = (w.rh_morning + w.rh_evening) / 2.0
    etl = ECONOMIC_THRESHOLD_LEVELS.get(payload.pest_name, ECONOMIC_THRESHOLD_LEVELS["default"])
    is_outbreak_now = int((payload.current_pest_count or 0) >= etl)
    sat_vp = 0.61078 * np.exp((17.27 * t_mean) / (t_mean + 237.3))
    vpd_kpa = round(max(sat_vp - sat_vp * (rh_mean / 100.0), 0.0), 3)
    week_sin = round(np.sin(2 * np.pi * payload.standard_week / 52.0), 4)
    week_cos = round(np.cos(2 * np.pi * payload.standard_week / 52.0), 4)
    humidity_persist = int(w.rh_morning >= 85.0 and w.rh_evening >= 60.0)

    try:
        input_dict = {
            "crop": payload.crop, "pest_name": payload.pest_name,
            "location": payload.location, "life_stage": "Adult",
            "collection_type": "Number/Light trap" if payload.crop.lower() == "rice" else "Number/ 3 leaves",
            "temp_max": w.temp_max, "temp_min": w.temp_min, "temp_mean": t_mean,
            "diurnal_temp_range": max(w.temp_max - w.temp_min, 0),
            "rh_morning": w.rh_morning, "rh_evening": w.rh_evening,
            "rh_mean": rh_mean, "rh_differential": rh_diff,
            "high_humidity_persistence": humidity_persist,
            "rainfall": w.rainfall, "wind_speed": w.wind_speed or 3.0,
            "sunshine_hours": w.sunshine_hours or 7.0, "evaporation": w.evaporation or 3.0,
            "vpd_kpa": vpd_kpa, "gdd": gdd,
            "standard_week": payload.standard_week, "week_sin": week_sin, "week_cos": week_cos,
            "pest_count": payload.current_pest_count or 0.0, "outbreak_current": is_outbreak_now,
            "temp_mean_lag1": t_mean, "temp_mean_lag2": t_mean,
            "rh_mean_lag1": rh_mean, "rh_mean_lag2": rh_mean,
            "rainfall_lag1": w.rainfall, "rainfall_lag2": w.rainfall,
            "gdd_lag1": gdd, "gdd_lag2": gdd,
            "pest_count_lag1": payload.current_pest_count or 0.0,
            "pest_count_lag2": payload.current_pest_count or 0.0,
            "pest_velocity": 0.0, "pest_acceleration": 0.0,
            "temp_rh_interaction": round(t_mean * rh_mean, 2),
            "humid_heat_index": round(w.temp_max * (w.rh_morning / 100.0), 2),
            "cumulative_gdd_3w": round(gdd * 3.0, 2),
        }
        row_df = pd.DataFrame([input_dict])
        X_encoded = ml_preprocessor.transform(row_df, return_df=True)
        explanations = explain_single_prediction(
            champion_model, X_encoded, ml_preprocessor.feature_names_, top_k=10
        )
        proba = float(champion_model.predict_proba(X_encoded)[0, 1])
        return {
            "risk_score": round(min(max(proba, 0.02), 0.99), 2),
            "model": model_benchmark_meta.get("champion_model", "Random Forest"),
            "note": "SHAP attributions indicate model contribution, not proof of biological causation.",
            "features": explanations,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


# -------------------------------------------------------------------------
# Live Weather
# -------------------------------------------------------------------------

@app.get("/api/v1/weather/live/{location}", tags=["Weather"])
def get_live_station_weather(location: str):
    """Fetches real-time weather observations for an ICAR research center using Open-Meteo."""
    return weather_service.fetch_station_weather(location)


# -------------------------------------------------------------------------
# Alert Notification Dispatch
# -------------------------------------------------------------------------

@app.post("/api/v1/alerts/dispatch", tags=["Alerts"])
def dispatch_alert(payload: AlertDispatchRequest):
    """Dispatches multi-channel early warning notification (Email / SMS)."""
    return alert_service.send_alert(
        alert_data=payload.prediction_data,
        recipient_email=payload.recipient_email,
        recipient_phone=payload.recipient_phone,
    )


# -------------------------------------------------------------------------
# Field Observations CRUD
# -------------------------------------------------------------------------

@app.get("/api/v1/observations", tags=["Field Observations"])
@app.get("/api/observations", tags=["Field Observations"])
def list_observations(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    crop: Optional[str] = Query(default=None),
    pest_name: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
):
    """Returns paginated field observations with optional crop/pest/location/date filters."""
    return db_service.get_observations(
        limit=limit, offset=offset,
        crop=crop, pest_name=pest_name,
        location=location, start_date=start_date, end_date=end_date,
    )


@app.post("/api/v1/observations", tags=["Field Observations"], status_code=201)
@app.post("/api/observations", tags=["Field Observations"], status_code=201)
def create_observation(payload: ObservationCreate):
    """Creates and persists a new field observation record."""
    obs_id = db_service.create_observation(payload.model_dump())
    if not obs_id:
        raise HTTPException(status_code=500, detail="Failed to create observation.")
    return {"status": "created", "observation_id": obs_id}


@app.get("/api/v1/observations/{obs_id}", tags=["Field Observations"])
@app.get("/api/observations/{obs_id}", tags=["Field Observations"])
def get_observation(obs_id: int):
    """Returns a single field observation by ID."""
    obs = db_service.get_observation_by_id(obs_id)
    if not obs:
        raise HTTPException(status_code=404, detail=f"Observation {obs_id} not found.")
    return obs


@app.patch("/api/v1/observations/{obs_id}", tags=["Field Observations"])
@app.patch("/api/observations/{obs_id}", tags=["Field Observations"])
def update_observation(obs_id: int, payload: ObservationUpdate):
    """Updates specified fields of a field observation (verification, notes, etc.)."""
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = db_service.update_observation(obs_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Observation {obs_id} not found or no valid fields to update.")
    return {"status": "updated", "observation_id": obs_id}


# -------------------------------------------------------------------------
# Alerts CRUD
# -------------------------------------------------------------------------

@app.get("/api/v1/alerts", tags=["Alerts"])
@app.get("/api/alerts", tags=["Alerts"])
def list_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None, description="active | acknowledged | resolved"),
    severity: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    pest_name: Optional[str] = Query(default=None),
):
    """Returns paginated alerts with optional filters."""
    return db_service.get_alerts(
        limit=limit, offset=offset,
        status=status, severity=severity,
        location=location, pest_name=pest_name,
    )


@app.post("/api/v1/alerts", tags=["Alerts"], status_code=201)
@app.post("/api/alerts", tags=["Alerts"], status_code=201)
def create_alert(payload: AlertCreate):
    """Creates an alert from a verified prediction or observation. Deduplicates active alerts."""
    alert_id = db_service.create_alert(payload.model_dump())
    if alert_id is None:
        return {"status": "deduplicated", "message": "An active alert for this location/pest already exists."}
    return {"status": "created", "alert_id": alert_id}


@app.patch("/api/v1/alerts/{alert_id}", tags=["Alerts"])
@app.patch("/api/alerts/{alert_id}", tags=["Alerts"])
def update_alert(alert_id: int, payload: AlertStatusUpdate):
    """Acknowledges or resolves an alert."""
    updated = db_service.update_alert_status(alert_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found or invalid status.")
    return {"status": "updated", "alert_id": alert_id, "new_status": payload.status}


# -------------------------------------------------------------------------
# Risk History
# -------------------------------------------------------------------------

@app.get("/api/v1/risk-history", tags=["Risk History"])
@app.get("/api/risk-history", tags=["Risk History"])
def get_risk_history(
    limit: int = Query(default=100, ge=1, le=500),
    crop: Optional[str] = Query(default=None),
    pest_name: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
):
    """Returns historical prediction risk scores for trend charting."""
    return {"items": db_service.get_risk_history(limit=limit, crop=crop, pest_name=pest_name, location=location)}


@app.get("/api/v1/stations/summary", tags=["Risk History"])
def get_station_risk_summary():
    """Returns latest risk per station for map marker colouring."""
    return {"stations": db_service.get_station_summary()}


# -------------------------------------------------------------------------
# Scouting & Audit (legacy routes — preserved for backward compatibility)
# -------------------------------------------------------------------------

@app.post("/api/v1/scouting/report", tags=["Scouting"])
def submit_scouting_report(payload: ScoutingReportRequest):
    """Submits and persists an in-field pest scouting observation."""
    entry_id = db_service.log_scouting_entry(payload.model_dump())
    return {"status": "success", "entry_id": entry_id, "message": "Scouting report logged successfully."}


@app.get("/api/v1/scouting/recent", tags=["Scouting"])
def get_recent_scouting_logs(limit: int = 25):
    """Returns recent in-field scouting records."""
    return db_service.get_recent_scouting(limit=limit)


@app.get("/api/v1/audit/predictions", tags=["Audit Trail"])
def get_prediction_audit_trail(limit: int = 25):
    """Returns historical prediction records with risk levels and SHAP factors."""
    return db_service.get_recent_predictions(limit=limit)
