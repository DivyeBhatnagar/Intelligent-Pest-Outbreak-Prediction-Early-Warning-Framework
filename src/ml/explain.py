from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

from src.config import SHAP_SUMMARY_PLOT
from src.utils.logger import get_logger

log = get_logger("ml.explain")


def compute_shap_explanations(
    model: Any,
    X_sample: pd.DataFrame,
    output_path: Optional[Path] = None,
    max_display: int = 15,
) -> Dict[str, float]:
    """
    Computes global SHAP (SHapley Additive exPlanations) values for the champion
    model and renders a feature importance summary plot.

    Args:
        model: Trained model (Tree-based estimator: XGBoost, LightGBM, Random Forest, etc.).
        X_sample: Sample of holdout evaluation features (e.g. 500-1000 rows).
        output_path: Destination path for PNG plot.
        max_display: Maximum number of top features to display on plot.

    Returns:
        Dictionary mapping feature names to their mean absolute SHAP importance.
    """
    target_path = output_path or SHAP_SUMMARY_PLOT
    log.info(f"Computing SHAP values on {len(X_sample)} background samples...")

    # Route explainer based on model class
    try:
        # If VotingClassifier, extract the primary tree estimator for TreeExplainer
        if hasattr(model, "estimators_"):
            tree_submodel = model.estimators_[0]
            explainer = shap.TreeExplainer(tree_submodel)
        else:
            explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_sample)
    except Exception:
        # Fallback for non-tree models or probability wrappers
        explainer = shap.Explainer(model, X_sample)
        shap_values = explainer(X_sample).values

    # In binary classification, take positive class (outbreak = 1) if returned as list/3D
    if isinstance(shap_values, list):
        # List of [shap_class_0, shap_class_1]
        vals = shap_values[1] if len(shap_values) > 1 else shap_values[0]
    elif len(shap_values.shape) == 3:
        # (N, features, classes)
        vals = shap_values[:, :, 1]
    else:
        vals = shap_values

    # Compute mean absolute importance per feature
    mean_abs_shap = np.abs(vals).mean(axis=0)
    importance_series = pd.Series(mean_abs_shap, index=X_sample.columns).sort_values(ascending=False)

    # Save SHAP Summary Bar Plot
    plt.figure(figsize=(10, 7))
    shap.summary_plot(
        vals,
        X_sample,
        plot_type="dot",
        max_display=max_display,
        show=False,
    )
    plt.title("Bio-Climatic & Entomological Feature Attributions (SHAP)", fontsize=13, pad=12)
    plt.tight_layout()
    target_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(target_path, dpi=200, bbox_inches="tight")
    plt.close()
    log.info(f"Saved SHAP global attribution plot -> {target_path.name}")

    return importance_series.head(20).to_dict()


def explain_single_prediction(
    model: Any,
    feature_vector: pd.DataFrame,
    feature_names: List[str],
    top_k: int = 4,
) -> List[Dict[str, str]]:
    """
    Computes local feature contributions for an individual observation and formats
    them into explainable human-readable agronomic advisory factors.
    Supports single tree models and VotingClassifier ensembles.
    """
    contributions = []

    # Extract weights from single model or average across ensemble estimators
    weights = None
    if hasattr(model, "feature_importances_"):
        weights = model.feature_importances_
    elif hasattr(model, "estimators_"):
        # Average feature importances across all sub-estimators that expose them
        sub_weights = [
            est.feature_importances_
            for est in model.estimators_
            if hasattr(est, "feature_importances_")
        ]
        if sub_weights:
            weights = np.mean(sub_weights, axis=0)

    if weights is not None:
        row_vals = feature_vector.iloc[0].values
        scores = row_vals * weights
        top_indices = np.argsort(np.abs(scores))[::-1][:top_k]

        friendly_names = {
            "gdd": "Growing Degree-Days (Thermal Development)",
            "vpd_kpa": "Vapor Pressure Deficit (Canopy Micro-Climate)",
            "temp_mean": "Mean Ambient Temperature",
            "rh_morning": "Morning Relative Humidity",
            "rh_evening": "Evening Canopy Humidity",
            "rainfall": "Precipitation & Soil Moisture",
            "pest_count": "Field Scout Population vs ETL",
            "pest_count_lag1": "Previous Week Pest Activity (t-1)",
            "pest_velocity": "Pest Population Growth Velocity",
            "pest_acceleration": "Pest Infestation Acceleration",
            "temp_rh_interaction": "Thermal-Humidity Canopy Interaction",
            "humid_heat_index": "Humid-Heat Canopy Index",
            "cumulative_gdd_3w": "3-Week Cumulative Thermal Sum (GDD)",
            "high_humidity_persistence": "Prolonged High Humidity",
        }

        for idx in top_indices:
            feat_name = feature_names[idx]
            val = row_vals[idx]
            impact = "Elevating Risk" if scores[idx] > 0 else "Moderating Risk"
            friendly = friendly_names.get(feat_name, feat_name.replace("_", " ").title())
            
            contributions.append({
                "feature": friendly,
                "impact": impact,
                "description": f"Observed feature signal: {val:.2f} (Attribution weight: {weights[idx]:.3f})",
            })

    return contributions


# Alias for concise import
explain_prediction = explain_single_prediction
