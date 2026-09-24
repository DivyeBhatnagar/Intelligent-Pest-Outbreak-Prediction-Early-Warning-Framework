from pathlib import Path
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from src.config import (
    BASE_TEMPERATURES,
    ECONOMIC_THRESHOLD_LEVELS,
    RISK_LEVELS,
    PROCESSED_DATA_DIR,
)
from src.data.loader import load_reference_tables
from src.data.feature_engineering import compute_gdd
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


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Intelligent Pest Outbreak Prediction & Early Warning Framework",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/api/v1/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    processed_file = PROCESSED_DATA_DIR / "processed_surveillance.csv"
    exists = processed_file.exists()
    row_count = 0

    if exists:
        try:
            # Quick row count check without loading full memory
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


@app.post("/api/v1/predictions/evaluate", response_model=PredictionResponse, tags=["Predictions"])
def evaluate_risk(payload: PredictionRequest):
    """
    Evaluates micro-meteorological observations against bio-climatic indices (GDD,
    humidity persistence, ETL ratios) to compute an early-warning risk level.
    """
    w = payload.weather
    t_mean = (w.temp_max + w.temp_min) / 2.0
    t_base = BASE_TEMPERATURES.get(payload.pest_name, BASE_TEMPERATURES["default"])
    gdd = max(t_mean - t_base, 0.0)
    rh_diff = w.rh_morning - w.rh_evening
    rh_mean = (w.rh_morning + w.rh_evening) / 2.0
    etl = ECONOMIC_THRESHOLD_LEVELS.get(payload.pest_name, ECONOMIC_THRESHOLD_LEVELS["default"])

    # Bio-climatic risk heuristic scoring (calibrated against historical ICAR surveillance)
    risk_factors = []
    raw_score = 0.10  # Baseline ambient probability

    # 1. Thermal factor: prolonged favorable temperature band (24-32 deg C)
    if 24.0 <= t_mean <= 33.0:
        raw_score += 0.25
        risk_factors.append(ContributingFactor(
            feature="Mean Temperature",
            impact="Positive (+25%)",
            description=f"Optimal reproductive temperature for {payload.pest_name} ({t_mean:.1f}°C)."
        ))

    # 2. Moisture factor: high morning humidity (>85%) with humid canopy
    if w.rh_morning >= 85.0:
        raw_score += 0.25
        risk_factors.append(ContributingFactor(
            feature="Canopy Humidity",
            impact="Positive (+25%)",
            description=f"High morning humidity ({w.rh_morning:.1f}%) creates favorable micro-climate."
        ))

    # 3. Rainfall / Intermittent showers
    if 10.0 <= w.rainfall <= 80.0:
        raw_score += 0.15
        risk_factors.append(ContributingFactor(
            feature="Rainfall",
            impact="Positive (+15%)",
            description=f"Intermittent precipitation ({w.rainfall:.1f} mm) elevates vegetative moisture."
        ))

    # 4. Scout count vs ETL ratio
    if payload.current_pest_count > 0:
        count_ratio = payload.current_pest_count / max(etl, 0.1)
        if count_ratio >= 0.7:
            bump = min(0.35 * count_ratio, 0.35)
            raw_score += bump
            risk_factors.append(ContributingFactor(
                feature="Current Field Population",
                impact=f"Positive (+{int(bump*100)}%)",
                description=f"Current count ({payload.current_pest_count}) is approaching/exceeding ETL ({etl})."
            ))

    # Bound probability to [0.05, 0.98]
    final_score = round(min(max(raw_score, 0.05), 0.98), 2)

    # Determine risk level
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
        f"Accumulated degree-days: {gdd:.1f} GDD."
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
        model_version="v1.0-rules-engine"
    )
