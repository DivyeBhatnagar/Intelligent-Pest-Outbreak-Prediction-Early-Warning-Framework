import argparse
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd

from src.config import (
    X_TRAIN_FILE,
    X_TEST_FILE,
    Y_TRAIN_FILE,
    Y_TEST_FILE,
    PROCESSED_DATA_DIR,
    MODELS_DIR,
    BEST_MODEL_FILE,
    MODEL_COMPARISON_FILE,
    SHAP_SUMMARY_PLOT,
    CONFUSION_MATRIX_PLOT,
    ROC_CURVE_PLOT,
)
from src.ml.train import train_candidate_models
from src.ml.evaluate import evaluate_models, select_best_model
from src.ml.explain import compute_shap_explanations
from src.utils.logger import get_logger

log = get_logger("ml.pipeline")


def load_ml_datasets() -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Loads preprocessed feature matrices and binary target vectors.
    Supports both Parquet and CSV sources.
    """
    log.info("Loading preprocessed training and testing matrices...")

    # Load X matrices
    if X_TRAIN_FILE.exists() and X_TEST_FILE.exists():
        X_train = pd.read_parquet(X_TRAIN_FILE)
        X_test = pd.read_parquet(X_TEST_FILE)
    else:
        X_train = pd.read_csv(PROCESSED_DATA_DIR / "X_train.csv")
        X_test = pd.read_csv(PROCESSED_DATA_DIR / "X_test.csv")

    # Load y targets (outbreak_next_week)
    y_train_df = pd.read_csv(Y_TRAIN_FILE)
    y_test_df = pd.read_csv(Y_TEST_FILE)

    y_train = y_train_df["outbreak_next_week"]
    y_test = y_test_df["outbreak_next_week"]

    log.info(
        f"Loaded datasets: X_train={X_train.shape}, X_test={X_test.shape}, "
        f"y_train={y_train.shape}, y_test={y_test.shape}"
    )
    return X_train, X_test, y_train, y_test


def run_ml_pipeline(
    selection_metric: str = "f1_score",
    run_shap: bool = True,
    shap_sample_size: int = 500,
) -> Dict[str, Any]:
    """
    End-to-end model training, benchmarking, champion selection, and SHAP
    explainability execution.
    """
    log.info("=== Launching Machine Learning Training & Evaluation Pipeline ===")

    # 1. Load data
    X_train, X_test, y_train, y_test = load_ml_datasets()

    # 2. Train candidate models
    trained_models = train_candidate_models(X_train=X_train, y_train=y_train)

    # 3. Evaluate models on holdout test set
    eval_results = evaluate_models(
        models=trained_models,
        X_test=X_test,
        y_test=y_test,
        save_plots=True,
    )

    # 4. Select champion model and save artifacts
    champion_name, champion_model = select_best_model(
        models=trained_models,
        eval_results=eval_results,
        metric=selection_metric,
        save=True,
    )

    # 5. Compute SHAP explainability
    shap_importances = {}
    if run_shap:
        X_sample = X_test.sample(min(shap_sample_size, len(X_test)), random_state=42)
        try:
            shap_importances = compute_shap_explanations(
                model=champion_model,
                X_sample=X_sample,
                output_path=SHAP_SUMMARY_PLOT,
            )
        except Exception as e:
            log.warning(f"Could not compute full SHAP plot: {str(e)}")

    # 6. Print formatted benchmarking comparison table
    print("\n" + "=" * 92)
    print("🏆 PEST OUTBREAK EARLY WARNING (t+1) — MODEL BENCHMARK COMPARISON")
    print("=" * 92)
    header = f"{'Model':<22} | {'Accuracy':<9} | {'Recall':<8} | {'Precision':<10} | {'F1-Score':<9} | {'ROC-AUC':<8} | {'FNR':<6}"
    print(header)
    print("-" * 92)

    for name, m in eval_results.items():
        is_champ = " ★" if name == champion_name else ""
        row = (
            f"{name + is_champ:<22} | {m['accuracy']:<9.4f} | {m['recall']:<8.4f} | "
            f"{m['precision']:<10.4f} | {m['f1_score']:<9.4f} | {m['roc_auc']:<8.4f} | {m['false_negative_rate']:<6.4f}"
        )
        print(row)

    print("-" * 92)
    champ_m = eval_results[champion_name]
    cm = champ_m["confusion_matrix"]
    print(f"★ CHAMPION MODEL        : {champion_name}")
    print(f"  • Primary Metric ({selection_metric}): {champ_m[selection_metric]:.4f}")
    print(f"  • Outbreak Recall     : {champ_m['recall']:.2%} (True Positive Rate)")
    print(f"  • Outbreak Precision  : {champ_m['precision']:.2%}")
    print(f"  • False Negatives     : {cm['false_negative']:,} out of {cm['false_negative'] + cm['true_positive']:,} outbreaks missed ({champ_m['false_negative_rate']:.2%})")
    print(f"  • ROC-AUC Score       : {champ_m['roc_auc']:.4f}")
    print("-" * 92)
    print("📁 GENERATED MODEL ARTIFACTS IN artifacts/models/")
    print("-" * 92)
    print(f" • Champion Model File  : {BEST_MODEL_FILE.name}")
    print(f" • Model Metrics JSON   : {MODEL_COMPARISON_FILE.name}")
    print(f" • ROC Benchmark Curve  : {ROC_CURVE_PLOT.name}")
    print(f" • Confusion Matrix     : {CONFUSION_MATRIX_PLOT.name}")
    if SHAP_SUMMARY_PLOT.exists():
        print(f" • SHAP Explainability  : {SHAP_SUMMARY_PLOT.name}")
    print("=" * 92 + "\n")

    return {
        "champion_name": champion_name,
        "eval_results": eval_results,
        "champion_model": champion_model,
        "shap_importances": shap_importances,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pest Prediction ML Training & Benchmarking Pipeline")
    parser.add_argument(
        "--metric",
        type=str,
        default="f1_score",
        choices=["f1_score", "roc_auc", "recall", "accuracy"],
        help="Primary metric for champion model selection (default: f1_score)",
    )
    parser.add_argument(
        "--no-shap",
        action="store_true",
        help="Skip SHAP explainability plot generation",
    )
    parser.add_argument(
        "--shap-samples",
        type=int,
        default=500,
        help="Number of test samples for SHAP computation (default: 500)",
    )
    args = parser.parse_args()

    run_ml_pipeline(
        selection_metric=args.metric,
        run_shap=not args.no_shap,
        shap_sample_size=args.shap_samples,
    )
