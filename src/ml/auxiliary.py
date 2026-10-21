from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import json
import pandas as pd
import numpy as np

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

from src.config import PROCESSED_DATA_DIR, MODELS_DIR
from src.utils.logger import get_logger

log = get_logger("ml.auxiliary")


def train_multi_pest_weather_model(save: bool = True) -> Dict[str, Any]:
    """
    Trains a model to predict the most likely pest species based purely on
    ambient micro-meteorological variables (Weather -> Pest Classification).
    """
    log.info("Training Multi-Pest Weather Classifier...")
    train_df = pd.read_csv(PROCESSED_DATA_DIR / "multi_pest_weather_train.csv")
    test_df = pd.read_csv(PROCESSED_DATA_DIR / "multi_pest_weather_test.csv")

    feature_cols = [
        "temp_max", "temp_min", "temp_mean", "diurnal_temp_range",
        "rh_morning", "rh_evening", "rh_mean", "rh_differential",
        "rainfall", "wind_speed", "sunshine_hours", "evaporation", "vpd_kpa"
    ]
    target_col = "pest_target_code"

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    # Unique pest classes mapping
    pest_mapping = train_df[["pest_target_code", "pest_name"]].drop_duplicates().sort_values("pest_target_code")
    class_names = pest_mapping["pest_name"].tolist()

    report = {
        "task": "Micro-Climate to Pest Species Prediction",
        "model": "Random Forest Classifier",
        "accuracy": round(float(acc), 4),
        "f1_weighted": round(float(f1), 4),
        "classes": class_names,
        "feature_importances": dict(zip(feature_cols, [round(float(w), 4) for w in model.feature_importances_])),
    }

    log.info(f"Multi-Pest Weather Model Accuracy: {acc:.2%}, Weighted F1: {f1:.4f}")

    if save:
        out_model = MODELS_DIR / "multi_pest_weather_model.joblib"
        out_meta = MODELS_DIR / "multi_pest_weather_metrics.json"
        joblib.dump(model, out_model)
        with open(out_meta, "w") as f:
            json.dump(report, f, indent=2)
        log.info(f"Saved Multi-Pest Weather model -> {out_model.name}")

    return report


def train_regional_severity_model(save: bool = True) -> Dict[str, Any]:
    """
    Trains a model to predict macro-regional pest infestation severity (Low, Medium, High).
    """
    log.info("Training Macro-Regional Infestation Severity Classifier...")
    train_df = pd.read_csv(PROCESSED_DATA_DIR / "regional_infestations_train.csv")
    test_df = pd.read_csv(PROCESSED_DATA_DIR / "regional_infestations_test.csv")

    feature_cols = [
        "month", "pest_code", "life_cycle_stage_code",
        "crop_affected_code", "state_code", "season_code"
    ]
    target_col = "severity_code"

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    report = {
        "task": "Macro-Regional Infestation Severity (Low/Medium/High)",
        "model": "Random Forest Classifier",
        "accuracy": round(float(acc), 4),
        "f1_weighted": round(float(f1), 4),
        "severity_levels": ["Low (0)", "Medium (1)", "High (2)"],
        "feature_importances": dict(zip(feature_cols, [round(float(w), 4) for w in model.feature_importances_])),
    }

    log.info(f"Regional Infestation Severity Model Accuracy: {acc:.2%}, Weighted F1: {f1:.4f}")

    if save:
        out_model = MODELS_DIR / "regional_severity_model.joblib"
        out_meta = MODELS_DIR / "regional_severity_metrics.json"
        joblib.dump(model, out_model)
        with open(out_meta, "w") as f:
            json.dump(report, f, indent=2)
        log.info(f"Saved Regional Severity model -> {out_model.name}")

    return report


def run_all_auxiliary_training() -> Dict[str, Any]:
    return {
        "multi_pest_weather": train_multi_pest_weather_model(save=True),
        "regional_severity": train_regional_severity_model(save=True),
    }


if __name__ == "__main__":
    run_all_auxiliary_training()
