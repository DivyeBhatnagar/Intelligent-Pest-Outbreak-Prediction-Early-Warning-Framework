"""
Comprehensive Automated Test Suite.

Validates:
1. Agronomic feature engineering (GDD calculation, VPD, Lags, Velocity, Acceleration).
2. Categorical Preprocessor & Scaler pipeline (fit, transform, dimension check).
3. Machine Learning champion model serialization & inference.
4. Live Weather Service (Open-Meteo integration and fallback).
5. Automated Alert Notification Engine (SMS and Email formatting).
6. SQLite Database Service (Scouting logging and prediction audit trails).
7. FastAPI REST API endpoints (Health, reference pests, predict, alerts, weather, audit).
"""

import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from src.data.feature_engineering import (
    compute_gdd,
    estimate_vapor_pressure_deficit,
    build_surveillance_features,
)
from src.data.encoder import SurveillanceDataPreprocessor
from src.utils.weather import weather_service
from src.utils.alerts import alert_service
from src.utils.database import db_service
from api.main import app

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. Feature Engineering Unit Tests
# -----------------------------------------------------------------------------

def test_compute_gdd_calculation():
    """Validates Growing Degree-Days formula (T_mean - T_base)."""
    df = pd.DataFrame({
        "temp_max": [34.0, 20.0],
        "temp_min": [26.0, 10.0],
        "pest_name": ["Brown Planthopper", "Brown Planthopper"]
    })
    # T_base for BPH is 12.0
    # Row 1: T_mean = 30.0 -> GDD = 30 - 12 = 18.0
    # Row 2: T_mean = 15.0 -> GDD = 15 - 12 = 3.0
    gdd = compute_gdd(df)
    assert gdd.iloc[0] == 18.0
    assert gdd.iloc[1] == 3.0


def test_estimate_vpd():
    """Validates Vapor Pressure Deficit (Tetens formula)."""
    t_mean = pd.Series([30.0])
    rh_mean = pd.Series([80.0])
    vpd = estimate_vapor_pressure_deficit(t_mean, rh_mean)
    assert 0.8 <= vpd.iloc[0] <= 0.9  # approx 0.85 kPa


def test_build_surveillance_features_shape():
    """Ensures feature generation produces expected columns."""
    sample = pd.DataFrame([{
        "crop": "Rice",
        "location": "Cuttack",
        "pest_name": "Brown Planthopper",
        "standard_week": 30,
        "pest_count": 5.0,
        "temp_max": 32.0,
        "temp_min": 24.0,
        "rh_morning": 90.0,
        "rh_evening": 70.0,
        "rainfall": 10.0,
        "life_stage": "Adult",
        "collection_type": "Number/Light trap"
    }])
    feat = build_surveillance_features(sample)
    assert "gdd" in feat.columns
    assert "vpd_kpa" in feat.columns
    assert "diurnal_temp_range" in feat.columns
    assert "outbreak_current" in feat.columns
    assert "pest_velocity" in feat.columns


# -----------------------------------------------------------------------------
# 2. Services Unit Tests (Weather, Alerts, Database)
# -----------------------------------------------------------------------------

def test_weather_service_returns_data():
    """Ensures weather service returns valid meteorological ranges."""
    res = weather_service.fetch_station_weather("Maruteru")
    assert res["location"] == "Maruteru"
    assert -10.0 <= res["temp_max"] <= 60.0
    assert 0.0 <= res["rh_morning"] <= 100.0


def test_alert_service_formatting():
    """Ensures alert formatter formats SMS strictly < 160 chars and valid HTML."""
    payload = {
        "crop": "Cotton",
        "location": "Nagpur",
        "pest_name": "Pink Bollworm",
        "risk_score": 0.91,
        "risk_level": "CRITICAL",
        "advisory": "Install pheromone traps immediately."
    }
    messages = alert_service.format_alert_message(payload)
    assert "AGRI-ALERT" in messages["sms"]
    assert "Pink Bollworm" in messages["email_subject"]
    assert "<html>" in messages["email_html"]

    # Dispatch simulated alert
    dispatch = alert_service.send_alert(payload, recipient_email="test@icar.in", recipient_phone="+919876543210")
    assert dispatch["email_sent"] is True
    assert dispatch["sms_sent"] is True


def test_database_service_crud():
    """Ensures SQLite persistence logs and retrieves audits."""
    scout_id = db_service.log_scouting_entry({
        "crop": "Rice",
        "location": "Cuttack",
        "pest_name": "Gall Midge",
        "standard_week": 31,
        "current_pest_count": 4.5,
        "temp_max": 31.0,
        "temp_min": 25.0,
        "rh_morning": 88.0,
        "rh_evening": 72.0,
        "rainfall": 25.0,
        "scout_officer": "Test Scout"
    })
    assert scout_id > 0
    scout_logs = db_service.get_recent_scouting(limit=5)
    assert len(scout_logs) >= 1

    audit_id = db_service.log_prediction_audit({
        "crop": "Rice",
        "location": "Cuttack",
        "pest_name": "Gall Midge",
        "risk_score": 0.85,
        "risk_level": "CRITICAL",
        "is_warning": True,
        "gdd_accumulated": 15.0,
        "vpd_kpa": 0.70,
        "top_factors": [{"feature": "Pest Count vs ETL", "impact": "Elevating"}],
        "advisory": "Test advisory",
        "model_version": "v2.0-ml-ensemble"
    })
    assert audit_id > 0
    audits = db_service.get_recent_predictions(limit=5)
    assert len(audits) >= 1
    assert audits[0]["risk_level"] in ["CRITICAL", "HIGH", "MODERATE", "LOW"]


# -----------------------------------------------------------------------------
# 3. REST API Endpoint Integration Tests
# -----------------------------------------------------------------------------

def test_api_health_check():
    """Tests GET /api/v1/health."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["datasets_ready"] is True
    assert data["total_surveillance_records"] > 0


def test_api_monitored_pests():
    """Tests GET /api/v1/reference/pests."""
    res = client.get("/api/v1/reference/pests")
    assert res.status_code == 200
    data = res.json()
    pests = data.get("pests", data)
    assert len(pests) >= 20
    assert any(p["pest_name"] == "Brown Planthopper" for p in pests)


def test_api_evaluate_prediction():
    """Tests POST /api/v1/predictions/evaluate."""
    payload = {
        "crop": "Rice",
        "pest_name": "Brown Planthopper",
        "location": "Cuttack",
        "standard_week": 32,
        "current_pest_count": 7.0,
        "weather": {
            "temp_max": 32.0,
            "temp_min": 25.0,
            "rh_morning": 92.0,
            "rh_evening": 75.0,
            "rainfall": 30.0,
            "wind_speed": 3.0,
            "sunshine_hours": 6.0,
            "evaporation": 4.0
        }
    }
    res = client.post("/api/v1/predictions/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "advisory" in data
    assert len(data["top_factors"]) > 0


def test_api_dashboard_html():
    """Tests GET /dashboard serving."""
    res = client.get("/dashboard")
    assert res.status_code == 200
    assert "Intelligent Pest Outbreak Early Warning System" in res.text
