"""
Comprehensive Automated Test Suite — v2.0
Intelligent Pest Outbreak Prediction & Early Warning System

Tests executed in categories:
  1. Feature engineering unit tests (GDD, VPD, surveillance feature builder)
  2. ML model and preprocessor integrity tests
  3. Micro-service unit tests (weather, alerts, database)
  4. REST API integration tests (all major endpoints)
  5. Observation CRUD tests
  6. Alert lifecycle tests
  7. Risk history and station summary tests
  8. Model evaluation endpoint tests
  9. End-to-end workflow test

NOTE: No test is marked as passing unless it has actually been executed.
      Mock or fabricated results are explicitly prohibited.
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
from src.utils.database import DatabaseService
from api.main import app

client = TestClient(app)


# =============================================================================
# CATEGORY 1 — Feature Engineering Unit Tests
# =============================================================================

def test_compute_gdd_calculation():
    """GDD = max(T_mean - T_base, 0). T_base for Brown Planthopper = 12.0°C."""
    df = pd.DataFrame({
        "temp_max": [34.0, 20.0],
        "temp_min": [26.0, 10.0],
        "pest_name": ["Brown Planthopper", "Brown Planthopper"]
    })
    gdd = compute_gdd(df)
    assert gdd.iloc[0] == 18.0, "Row 1: T_mean=30, GDD=18"
    assert gdd.iloc[1] == 3.0,  "Row 2: T_mean=15, GDD=3"


def test_compute_gdd_non_negative():
    """GDD must be non-negative even when temperature is below base."""
    df = pd.DataFrame({
        "temp_max": [8.0],
        "temp_min": [2.0],
        "pest_name": ["Brown Planthopper"]
    })
    gdd = compute_gdd(df)
    assert gdd.iloc[0] == 0.0, "GDD clamped to zero below T_base"


def test_estimate_vpd():
    """VPD at 30°C, 80% RH ≈ 0.85 kPa (Tetens formula tolerance ±0.1)."""
    t_mean = pd.Series([30.0])
    rh_mean = pd.Series([80.0])
    vpd = estimate_vapor_pressure_deficit(t_mean, rh_mean)
    assert 0.8 <= vpd.iloc[0] <= 0.9, f"VPD expected ~0.85 kPa, got {vpd.iloc[0]}"


def test_build_surveillance_features_shape():
    """Surveillance feature builder must return required agronomic columns."""
    sample = pd.DataFrame([{
        "crop": "Rice", "location": "Cuttack",
        "pest_name": "Brown Planthopper", "standard_week": 30,
        "pest_count": 5.0, "temp_max": 32.0, "temp_min": 24.0,
        "rh_morning": 90.0, "rh_evening": 70.0, "rainfall": 10.0,
        "life_stage": "Adult", "collection_type": "Number/Light trap"
    }])
    feat = build_surveillance_features(sample)
    for col in ["gdd", "vpd_kpa", "diurnal_temp_range", "outbreak_current", "pest_velocity"]:
        assert col in feat.columns, f"Missing column: {col}"


# =============================================================================
# CATEGORY 2 — ML Model & Preprocessor Integrity
# =============================================================================

def test_model_artifact_loads():
    """Champion model artifact must load without error."""
    from src.config import BEST_MODEL_FILE
    import joblib
    assert BEST_MODEL_FILE.exists(), "best_model.joblib not found in artifacts/models/"
    model = joblib.load(BEST_MODEL_FILE)
    assert hasattr(model, "predict_proba"), "Model does not expose predict_proba"


def test_preprocessor_artifact_loads():
    """Preprocessor artifact must load and expose feature_names_."""
    from src.config import PREPROCESSOR_FILE
    prep = SurveillanceDataPreprocessor.load(PREPROCESSOR_FILE)
    assert hasattr(prep, "feature_names_"), "Preprocessor missing feature_names_"
    assert len(prep.feature_names_) > 0


def test_model_comparison_artifact():
    """Model comparison JSON must exist and contain champion model key."""
    from src.config import MODEL_COMPARISON_FILE
    import json
    assert MODEL_COMPARISON_FILE.exists()
    with open(MODEL_COMPARISON_FILE) as f:
        meta = json.load(f)
    assert "champion_model" in meta
    assert meta["champion_model"] == "Random Forest"
    assert "models" in meta


# =============================================================================
# CATEGORY 3 — Micro-Service Unit Tests
# =============================================================================

def test_weather_service_returns_valid_data():
    """Weather service must return meteorologically plausible values."""
    res = weather_service.fetch_station_weather("Maruteru")
    assert res["location"] == "Maruteru"
    assert -10.0 <= res["temp_max"] <= 60.0
    assert 0.0 <= res["rh_morning"] <= 100.0
    assert res["status"] in ("success", "fallback")
    assert "season" in res
    assert "standard_week" in res
    assert "date" in res
    assert "time" in res


def test_weather_service_unknown_location_fallback():
    """Unknown location should fall back gracefully (no exception)."""
    res = weather_service.fetch_station_weather("NonExistentPlace")
    assert "temp_max" in res
    assert res["status"] in ("success", "fallback")


def test_weather_service_source_labelled():
    """Weather response must include a data source label."""
    res = weather_service.fetch_station_weather("Cuttack")
    assert "source" in res and len(res["source"]) > 0


def test_alert_service_formatting():
    """Alert formatter must produce <160 char SMS and valid HTML email."""
    payload = {
        "crop": "Cotton", "location": "Nagpur", "pest_name": "Pink Bollworm",
        "risk_score": 0.91, "risk_level": "CRITICAL",
        "advisory": "Install pheromone traps immediately."
    }
    messages = alert_service.format_alert_message(payload)
    assert "AGRI-ALERT" in messages["sms"]
    assert len(messages["sms"]) <= 160, "SMS exceeds 160 chars"
    assert "Pink Bollworm" in messages["email_subject"]
    assert "<html>" in messages["email_html"]

    dispatch = alert_service.send_alert(payload, recipient_email="test@icar.in", recipient_phone="+919876543210")
    assert dispatch["email_sent"] is True
    assert dispatch["sms_sent"] is True


def test_database_service_scouting_crud():
    """Database service must log and retrieve scouting entries correctly."""
    import tempfile, os
    from pathlib import Path
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        db = DatabaseService(db_path=tmp_path)
        sid = db.log_scouting_entry({
            "crop": "Rice", "location": "Cuttack", "pest_name": "Gall Midge",
            "standard_week": 31, "current_pest_count": 4.5,
            "temp_max": 31.0, "temp_min": 25.0, "rh_morning": 88.0,
            "rh_evening": 72.0, "rainfall": 25.0, "scout_officer": "Test Scout"
        })
        assert sid > 0
        logs = db.get_recent_scouting(limit=5)
        assert len(logs) >= 1
    finally:
        os.unlink(tmp_path)


def test_database_service_prediction_audit():
    """Prediction audit trail must persist and retrieve risk records."""
    import tempfile, os
    from pathlib import Path
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        db = DatabaseService(db_path=tmp_path)
        aid = db.log_prediction_audit({
            "crop": "Rice", "location": "Cuttack", "pest_name": "Gall Midge",
            "risk_score": 0.85, "risk_level": "CRITICAL", "is_warning": True,
            "gdd_accumulated": 15.0, "vpd_kpa": 0.70,
            "top_factors": [{"feature": "Pest Count vs ETL", "impact": "Elevating"}],
            "advisory": "Test advisory", "model_version": "v2.0-ml-random-forest"
        })
        assert aid > 0
        audits = db.get_recent_predictions(limit=5)
        assert len(audits) >= 1
        assert audits[0]["risk_level"] in ["CRITICAL", "HIGH", "MODERATE", "LOW"]
    finally:
        os.unlink(tmp_path)


def test_database_observation_crud():
    """Field observation CRUD must create, retrieve, and update correctly."""
    import tempfile, os
    from pathlib import Path
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        db = DatabaseService(db_path=tmp_path)
        obs_id = db.create_observation({
            "observation_date": "2026-10-15",
            "crop": "Cotton", "pest_name": "Pink Bollworm",
            "location": "Nagpur", "standard_week": 42,
            "pest_count": 3.0, "count_unit": "per trap",
            "observer_id": "Agent007"
        })
        assert obs_id > 0
        obs = db.get_observation_by_id(obs_id)
        assert obs is not None
        assert obs["pest_name"] == "Pink Bollworm"

        updated = db.update_observation(obs_id, {"verification_status": "verified"})
        assert updated is True

        result = db.get_observations(limit=5)
        assert result["total"] >= 1
    finally:
        os.unlink(tmp_path)


def test_database_alert_lifecycle():
    """Alert creation, deduplication, and status update must work correctly."""
    import tempfile, os
    from pathlib import Path
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        db = DatabaseService(db_path=tmp_path)
        alert_data = {
            "severity": "HIGH", "location": "Cuttack",
            "pest_name": "Brown Planthopper", "crop": "Rice",
            "risk_score": 0.75, "explanation_summary": "Test alert"
        }
        aid1 = db.create_alert(alert_data)
        assert aid1 is not None and aid1 > 0

        # Deduplication: same active alert should not be created twice
        aid2 = db.create_alert(alert_data)
        assert aid2 is None, "Duplicate active alert should be rejected"

        # Status update
        ok = db.update_alert_status(aid1, "acknowledged")
        assert ok is True

        cnt = db.get_active_alert_count()
        assert cnt == 0  # acknowledged is not active
    finally:
        os.unlink(tmp_path)


# =============================================================================
# CATEGORY 4 — REST API Integration Tests
# =============================================================================

def test_api_root():
    """GET / returns service info."""
    res = client.get("/")
    assert res.status_code == 200
    d = res.json()
    assert d["status"] == "online"
    assert "dashboard_url" in d


def test_api_health_check():
    """GET /api/v1/health returns healthy with real counts."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    d = res.json()
    assert d["status"] == "healthy"
    assert d["datasets_ready"] is True
    assert d["total_surveillance_records"] > 0
    assert "active_alerts" in d
    assert "model_loaded" in d


def test_api_stations():
    """GET /api/v1/stations returns all 11 ICAR monitoring centres."""
    res = client.get("/api/v1/stations")
    assert res.status_code == 200
    d = res.json()
    assert d["count"] == 11
    names = [s["name"] for s in d["stations"]]
    assert "Cuttack" in names


def test_api_monitored_pests():
    """GET /api/v1/reference/pests returns ≥20 pests with ETL values."""
    res = client.get("/api/v1/reference/pests")
    assert res.status_code == 200
    d = res.json()
    assert len(d["pests"]) >= 20
    assert any(p["pest_name"] == "Brown Planthopper" for p in d["pests"])
    for p in d["pests"]:
        assert "economic_threshold_level" in p


def test_api_evaluate_prediction_basic():
    """POST /api/v1/predictions/evaluate returns valid risk score and factors."""
    payload = {
        "crop": "Rice", "pest_name": "Brown Planthopper",
        "location": "Cuttack", "standard_week": 32, "current_pest_count": 7.0,
        "weather": { "temp_max": 32.0, "temp_min": 25.0, "rh_morning": 92.0,
                     "rh_evening": 75.0, "rainfall": 30.0, "wind_speed": 3.0,
                     "sunshine_hours": 6.0, "evaporation": 4.0 }
    }
    res = client.post("/api/v1/predictions/evaluate", json=payload)
    assert res.status_code == 200
    d = res.json()
    assert 0.0 <= d["risk_score"] <= 1.0
    assert d["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "advisory" in d
    assert len(d["top_factors"]) > 0
    assert "model_version" in d


def test_api_evaluate_prediction_cotton():
    """POST /api/v1/predictions/evaluate works for Cotton / American Bollworm."""
    payload = {
        "crop": "Cotton", "pest_name": "American Bollworm",
        "location": "Nagpur", "standard_week": 28, "current_pest_count": 2.0,
        "weather": { "temp_max": 36.0, "temp_min": 27.0, "rh_morning": 72.0,
                     "rh_evening": 52.0, "rainfall": 5.0 }
    }
    res = client.post("/api/v1/predictions/evaluate", json=payload)
    assert res.status_code == 200
    d = res.json()
    assert d["crop"] == "Cotton"
    assert 0.0 <= d["risk_score"] <= 1.0


def test_api_evaluate_prediction_invalid_temp():
    """POST with temp_max > 60°C must be rejected with 422."""
    payload = {
        "crop": "Rice", "pest_name": "Brown Planthopper",
        "location": "Cuttack", "standard_week": 32,
        "weather": { "temp_max": 99.0, "temp_min": 25.0, "rh_morning": 85.0, "rh_evening": 65.0 }
    }
    res = client.post("/api/v1/predictions/evaluate", json=payload)
    assert res.status_code == 422


def test_api_predict_alias():
    """POST /api/predict (alias) returns same structure."""
    payload = {
        "crop": "Rice", "pest_name": "Leaf Folder",
        "location": "Maruteru", "standard_week": 38, "current_pest_count": 1.0,
        "weather": { "temp_max": 30.0, "temp_min": 23.0, "rh_morning": 88.0, "rh_evening": 70.0, "rainfall": 15.0 }
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200


def test_api_model_benchmarks():
    """GET /api/v1/models/benchmark returns champion model and models dict."""
    res = client.get("/api/v1/models/benchmark")
    assert res.status_code == 200
    d = res.json()
    assert d["champion_model"] == "Random Forest"
    assert "models" in d


def test_api_model_comparison():
    """GET /api/model-comparison returns enriched comparison with test set info."""
    res = client.get("/api/model-comparison")
    assert res.status_code == 200
    d = res.json()
    assert d["champion"] == "Random Forest"
    assert d["test_size"] == 8060
    assert d["train_size"] == 27439
    models = {m["model"]: m for m in d["models"]}
    rf = models["Random Forest"]
    assert abs(rf["f1_score"] - 0.9067) < 0.01
    assert abs(rf["roc_auc"] - 0.956) < 0.01


def test_api_dashboard_html():
    """GET /dashboard returns the full HTML with multi-tab navigation."""
    res = client.get("/dashboard")
    assert res.status_code == 200
    assert "Intelligent Pest Outbreak Early Warning System" in res.text
    assert "nav-tab" in res.text
    assert "Model Performance" in res.text
    assert "Field Observations" in res.text


# =============================================================================
# CATEGORY 5 — Observation CRUD API Tests
# =============================================================================

def _make_observation_payload(**overrides):
    base = {
        "observation_date": "2026-10-20",
        "crop": "Rice", "pest_name": "Yellow Stem Borer",
        "location": "Cuttack", "standard_week": 43,
        "pest_count": 2.5, "count_unit": "per hill",
        "life_stage": "Nymph", "collection_method": "Visual count",
        "observer_id": "Scout-A1", "notes": "Test obs"
    }
    base.update(overrides)
    return base


def test_api_create_observation():
    """POST /api/observations creates a record and returns 201."""
    res = client.post("/api/observations", json=_make_observation_payload())
    assert res.status_code == 201
    d = res.json()
    assert d["status"] == "created"
    assert "observation_id" in d


def test_api_list_observations():
    """GET /api/observations returns paginated results."""
    client.post("/api/observations", json=_make_observation_payload())
    res = client.get("/api/observations?limit=10&offset=0")
    assert res.status_code == 200
    d = res.json()
    assert "items" in d
    assert "total" in d
    assert d["total"] >= 1


def test_api_get_observation_by_id():
    """GET /api/observations/{id} returns the specific record."""
    create_res = client.post("/api/observations", json=_make_observation_payload())
    obs_id = create_res.json()["observation_id"]
    res = client.get(f"/api/observations/{obs_id}")
    assert res.status_code == 200
    d = res.json()
    assert d["id"] == obs_id
    assert d["pest_name"] == "Yellow Stem Borer"


def test_api_update_observation():
    """PATCH /api/observations/{id} updates verification status."""
    create_res = client.post("/api/observations", json=_make_observation_payload())
    obs_id = create_res.json()["observation_id"]
    res = client.patch(f"/api/observations/{obs_id}", json={"verification_status": "verified"})
    assert res.status_code == 200
    d = res.json()
    assert d["status"] == "updated"


def test_api_observation_404():
    """GET /api/observations/99999 returns 404."""
    res = client.get("/api/observations/99999")
    assert res.status_code == 404


def test_api_observation_filter_by_crop():
    """GET /api/observations?crop=Cotton filters correctly."""
    client.post("/api/observations", json=_make_observation_payload(crop="Cotton", pest_name="Whitefly"))
    res = client.get("/api/observations?crop=Cotton")
    assert res.status_code == 200
    items = res.json()["items"]
    assert all(i["crop"] == "Cotton" for i in items)


# =============================================================================
# CATEGORY 6 — Alert Lifecycle API Tests
# =============================================================================

def _make_alert_payload(**overrides):
    base = {
        "severity": "HIGH", "location": "Ludhiana",
        "pest_name": "Whitefly", "crop": "Cotton",
        "risk_score": 0.78, "explanation_summary": "Test alert from API test suite"
    }
    base.update(overrides)
    return base


def test_api_create_alert():
    """POST /api/alerts creates an alert."""
    # Use unique location to avoid dedup issues
    res = client.post("/api/alerts", json=_make_alert_payload(location="Palampur", pest_name="Aphid", severity="MODERATE"))
    assert res.status_code == 201
    d = res.json()
    assert d["status"] in ("created", "deduplicated")


def test_api_list_alerts():
    """GET /api/alerts returns paginated list."""
    res = client.get("/api/alerts?limit=10")
    assert res.status_code == 200
    d = res.json()
    assert "items" in d


def test_api_list_alerts_filter_status():
    """GET /api/alerts?status=active returns only active alerts."""
    res = client.get("/api/alerts?status=active")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["status"] == "active"


def test_api_alert_acknowledge():
    """PATCH /api/alerts/{id} with status=acknowledged works."""
    create = client.post("/api/alerts", json=_make_alert_payload(location="Sirsa", pest_name="Jassid"))
    if create.json().get("alert_id"):
        aid = create.json()["alert_id"]
        res = client.patch(f"/api/alerts/{aid}", json={"status": "acknowledged"})
        assert res.status_code == 200
        assert res.json()["new_status"] == "acknowledged"


def test_api_alert_resolve():
    """PATCH /api/alerts/{id} with status=resolved closes an alert."""
    create = client.post("/api/alerts", json=_make_alert_payload(location="Pharbhani", pest_name="Mealybug"))
    if create.json().get("alert_id"):
        aid = create.json()["alert_id"]
        res = client.patch(f"/api/alerts/{aid}", json={"status": "resolved"})
        assert res.status_code == 200


# =============================================================================
# CATEGORY 7 — Risk History & Station Summary
# =============================================================================

def test_api_risk_history():
    """GET /api/risk-history returns items list (may be empty if no predictions yet)."""
    res = client.get("/api/risk-history?limit=20")
    assert res.status_code == 200
    d = res.json()
    assert "items" in d


def test_api_station_summary():
    """GET /api/v1/stations/summary returns per-station latest risk."""
    res = client.get("/api/v1/stations/summary")
    assert res.status_code == 200
    d = res.json()
    assert "stations" in d


# =============================================================================
# CATEGORY 8 — End-to-End Workflow Test
# =============================================================================

def test_e2e_full_prediction_to_alert_workflow():
    """
    End-to-end: Predict → persist audit → auto-create alert → list alert →
    acknowledge → resolve → verify risk history reflects it.
    """
    # Step 1: Submit a HIGH-risk prediction
    pred_payload = {
        "crop": "Rice", "pest_name": "Brown Planthopper",
        "location": "Raipur", "standard_week": 35, "current_pest_count": 12.0,
        "weather": { "temp_max": 33.0, "temp_min": 26.0, "rh_morning": 94.0,
                     "rh_evening": 80.0, "rainfall": 55.0, "wind_speed": 2.5 }
    }
    pred_res = client.post("/api/v1/predictions/evaluate", json=pred_payload)
    assert pred_res.status_code == 200
    pred = pred_res.json()
    assert 0.0 <= pred["risk_score"] <= 1.0

    # Step 2: Verify prediction persisted in audit trail
    audit_res = client.get("/api/v1/audit/predictions?limit=5")
    assert audit_res.status_code == 200
    audit_items = audit_res.json()
    assert len(audit_items) > 0
    recent = audit_items[0]
    assert recent["crop"] == "Rice"

    # Step 3: Submit a field observation for the same station
    obs_payload = {
        "observation_date": "2026-10-22",
        "crop": "Rice", "pest_name": "Brown Planthopper",
        "location": "Raipur", "standard_week": 35,
        "pest_count": 12.0, "count_unit": "per hill",
        "observer_id": "E2E-Scout", "verification_status": "pending"
    }
    obs_res = client.post("/api/observations", json=obs_payload)
    assert obs_res.status_code == 201
    obs_id = obs_res.json()["observation_id"]

    # Step 4: Verify observation is retrievable
    get_obs = client.get(f"/api/observations/{obs_id}")
    assert get_obs.status_code == 200
    assert get_obs.json()["location"] == "Raipur"

    # Step 5: Update observation verification
    upd = client.patch(f"/api/observations/{obs_id}", json={"verification_status": "verified"})
    assert upd.status_code == 200

    # Step 6: If alert was auto-created, retrieve and acknowledge it
    alerts_res = client.get("/api/alerts?location=Raipur&pest_name=Brown Planthopper&status=active")
    assert alerts_res.status_code == 200
    active_alerts = [a for a in alerts_res.json()["items"] if a["status"] == "active"]
    for a in active_alerts[:1]:
        ack = client.patch(f"/api/alerts/{a['id']}", json={"status": "resolved"})
        assert ack.status_code == 200

    # Step 7: Risk history must include the Raipur prediction
    hist_res = client.get("/api/risk-history?location=Raipur")
    assert hist_res.status_code == 200
    hist_items = hist_res.json()["items"]
    assert any(h["location"] == "Raipur" for h in hist_items)

    # Step 8: Health check reflects system is still healthy
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"
