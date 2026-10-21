import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
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
from api.schemas import (
    PredictionRequest,
    PredictionResponse,
    ContributingFactor,
    HealthCheckResponse,
)

app = FastAPI(
    title="Intelligent Pest Outbreak Prediction & Early Warning API",
    description="AgriTech AI service providing real-time bio-climatic pest outbreak predictions and early warnings.",
    version="1.0.0",
)

# Allow local frontend or mobile apps to query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained ML model and preprocessor if available
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


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Intelligent Pest Outbreak Prediction & Early Warning Framework",
        "status": "online",
        "version": "1.0.0",
        "champion_model": model_benchmark_meta.get("champion_model", "Trained ML Model"),
        "docs_url": "/docs",
    }


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

    return HealthCheckResponse(
        status="healthy",
        version="1.0.0",
        datasets_ready=exists,
        total_surveillance_records=max(row_count, 0),
    )


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


@app.get("/api/v1/models/benchmark", tags=["Machine Learning"])
def get_model_benchmarks():
    """Returns comparative validation metrics across all trained ML models evaluated on holdout test seasons."""
    if not model_benchmark_meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model benchmark report not found. Run 'python3 -m src.ml.pipeline' first.",
        )
    return model_benchmark_meta


@app.get("/api/v1/models/benchmark/full", tags=["Machine Learning"])
def get_full_dataset_benchmark():
    """Returns champion model performance evaluated across the entire 35,499 records dataset."""
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


@app.post("/api/v1/predictions/evaluate", response_model=PredictionResponse, tags=["Predictions"])
def evaluate_risk(payload: PredictionRequest):
    """
    Evaluates micro-meteorological observations and field scouting data against the
    champion Machine Learning model and bio-climatic indices to compute an early-warning risk level.
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

    # Vapor pressure deficit approximation
    sat_vp = 0.61078 * np.exp((17.27 * t_mean) / (t_mean + 237.3))
    actual_vp = sat_vp * (rh_mean / 100.0)
    vpd_kpa = round(max(sat_vp - actual_vp, 0.0), 3)

    # Cyclical meteorological week
    week_sin = round(np.sin(2 * np.pi * payload.standard_week / 52.0), 4)
    week_cos = round(np.cos(2 * np.pi * payload.standard_week / 52.0), 4)
    humidity_persist = int(w.rh_morning >= 85.0 and w.rh_evening >= 60.0)

    risk_factors: List[ContributingFactor] = []
    final_score = 0.50
    model_version_tag = "v1.0-rules-engine"

    # 1. Run Machine Learning Model Inference if available
    if champion_model is not None and ml_preprocessor is not None:
        try:
            # Construct tabular row matching preprocessor feature expectations
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
            }
            row_df = pd.DataFrame([input_dict])
            X_encoded = ml_preprocessor.transform(row_df, return_df=True)

            # Predict probability with champion model
            proba = float(champion_model.predict_proba(X_encoded)[0, 1])
            final_score = round(min(max(proba, 0.02), 0.99), 2)
            champ_name = model_benchmark_meta.get("champion_model", "Random Forest")
            model_version_tag = f"v2.0-ml-{champ_name.lower().replace(' ', '-')}"

            # Compute local feature attributions
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
            # Fall back to heuristic rule scoring if exception
            final_score = 0.50

    # 2. Heuristic fallback if ML attribution list is empty
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

    # 3. Determine Risk Severity Level
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
        f"VPD: {vpd_kpa:.2f} kPa."
    )

    return PredictionResponse(
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
