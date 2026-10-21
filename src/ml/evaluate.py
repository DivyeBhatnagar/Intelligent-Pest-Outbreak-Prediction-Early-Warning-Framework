import json
from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    roc_curve,
    precision_recall_curve,
)

from src.config import (
    BEST_MODEL_FILE,
    MODEL_COMPARISON_FILE,
    CONFUSION_MATRIX_PLOT,
    ROC_CURVE_PLOT,
    MODELS_DIR,
)
from src.utils.logger import get_logger

log = get_logger("ml.evaluate")


def evaluate_models(
    models: Dict[str, Any],
    X_test: pd.DataFrame,
    y_test: pd.Series,
    save_plots: bool = True,
) -> Dict[str, Dict[str, Any]]:
    """
    Evaluates trained candidate models on holdout test data across standard
    agronomic early-warning metrics.

    Returns:
        Dictionary mapping model names to performance metrics.
    """
    if isinstance(y_test, pd.DataFrame):
        y_test = y_test.iloc[:, 0]
    y_test = np.asarray(y_test).ravel()

    results: Dict[str, Dict[str, Any]] = {}
    roc_curves: Dict[str, Tuple[np.ndarray, np.ndarray, float]] = {}

    log.info(f"Evaluating {len(models)} candidate models on holdout test split ({len(X_test):,} records)...")

    for name, model in models.items():
        y_pred = model.predict(X_test)
        
        # Predicted probabilities
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_test)[:, 1]
        elif hasattr(model, "decision_function"):
            y_proba = model.decision_function(X_test)
        else:
            y_proba = y_pred.astype(float)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))

        try:
            auc = float(roc_auc_score(y_test, y_proba))
        except Exception:
            auc = 0.5

        try:
            pr_auc = float(average_precision_score(y_test, y_proba))
        except Exception:
            pr_auc = 0.5

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

        # False Negative Rate (FNR) is critical for early warning: missing an outbreak is high risk
        fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

        results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "pr_auc": round(pr_auc, 4),
            "false_negative_rate": round(fnr, 4),
            "confusion_matrix": {
                "true_negative": tn,
                "false_positive": fp,
                "false_negative": fn,
                "true_positive": tp,
            },
        }

        fpr, tpr, _ = roc_curve(y_test, y_proba)
        roc_curves[name] = (fpr, tpr, auc)

        log.info(
            f"[{name}] -> Accuracy: {acc:.4f} | Recall: {rec:.4f} | Precision: {prec:.4f} | "
            f"F1: {f1:.4f} | ROC-AUC: {auc:.4f} | FNR: {fnr:.4f}"
        )

    # Generate and save ROC Curve comparison plot
    if save_plots:
        _plot_roc_curves(roc_curves, ROC_CURVE_PLOT)

    return results


def _plot_roc_curves(
    roc_curves: Dict[str, Tuple[np.ndarray, np.ndarray, float]],
    output_path: Path,
):
    """Generates comparison ROC curves across all candidate models."""
    plt.figure(figsize=(9, 6))
    plt.plot([0, 1], [0, 1], "k--", alpha=0.6, label="Random Guess (AUC = 0.50)")

    for name, (fpr, tpr, auc) in roc_curves.items():
        plt.plot(fpr, tpr, label=f"{name} (AUC = {auc:.3f})", linewidth=2)

    plt.xlabel("False Positive Rate (1 - Specificity)", fontsize=11)
    plt.ylabel("True Positive Rate (Recall / Sensitivity)", fontsize=11)
    plt.title("ROC Curve Benchmark — Pest Outbreak Early Warning Models", fontsize=13, pad=12)
    plt.legend(loc="lower right", frameon=True)
    plt.grid(True, linestyle="--", alpha=0.4)
    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=200)
    plt.close()
    log.info(f"Saved ROC comparison plot -> {output_path.name}")


def _plot_confusion_matrix(cm: Dict[str, int], model_name: str, output_path: Path):
    """Generates styled confusion matrix heatmap for champion model."""
    matrix = np.array([
        [cm["true_negative"], cm["false_positive"]],
        [cm["false_negative"], cm["true_positive"]]
    ])
    plt.figure(figsize=(6, 5))
    sns.heatmap(
        matrix,
        annot=True,
        fmt=",d",
        cmap="Greens",
        xticklabels=["No Outbreak (0)", "Outbreak (1)"],
        yticklabels=["No Outbreak (0)", "Outbreak (1)"],
        cbar=False,
    )
    plt.xlabel("Predicted Label (t+1)", fontsize=11)
    plt.ylabel("Ground Truth Label (t+1)", fontsize=11)
    plt.title(f"Confusion Matrix — Champion Model [{model_name}]", fontsize=12, pad=10)
    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=200)
    plt.close()
    log.info(f"Saved Confusion Matrix plot -> {output_path.name}")


def select_best_model(
    models: Dict[str, Any],
    eval_results: Dict[str, Dict[str, Any]],
    metric: str = "f1_score",
    save: bool = True,
) -> Tuple[str, Any]:
    """
    Identifies champion model according to primary target metric (F1-score / ROC-AUC),
    saves the serialized model to artifacts/models/best_model.joblib, and persists
    the benchmark comparison JSON.
    """
    best_name = max(eval_results.keys(), key=lambda k: eval_results[k][metric])
    best_model = models[best_name]
    best_score = eval_results[best_name][metric]

    log.info(f"Champion Model selected: [{best_name}] with {metric} = {best_score:.4f}")

    if save:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        # Save serialized model
        joblib.dump(best_model, BEST_MODEL_FILE)
        log.info(f"Saved champion model to {BEST_MODEL_FILE}")

        # Save confusion matrix plot for best model
        _plot_confusion_matrix(
            eval_results[best_name]["confusion_matrix"],
            best_name,
            CONFUSION_MATRIX_PLOT,
        )

        # Save comparison JSON
        comparison_payload = {
            "champion_model": best_name,
            "selection_metric": metric,
            "champion_score": best_score,
            "models": eval_results,
        }
        with open(MODEL_COMPARISON_FILE, "w") as f:
            json.dump(comparison_payload, f, indent=2)
        log.info(f"Saved model comparison report to {MODEL_COMPARISON_FILE}")

    return best_name, best_model
