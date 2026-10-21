import time
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

from src.utils.logger import get_logger

log = get_logger("ml.train")


def get_candidate_models(random_state: int = 42) -> Dict[str, Any]:
    """
    Initializes a justified set of machine learning algorithms for agricultural
    pest outbreak early-warning classification.
    """
    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            C=1.0,
            class_weight="balanced",
            random_state=random_state,
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=8,
            min_samples_split=20,
            min_samples_leaf=10,
            class_weight="balanced",
            random_state=random_state,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=14,
            min_samples_split=10,
            min_samples_leaf=5,
            class_weight="balanced",
            n_jobs=-1,
            random_state=random_state,
        ),
        "LightGBM": LGBMClassifier(
            n_estimators=150,
            learning_rate=0.05,
            max_depth=8,
            num_leaves=31,
            class_weight="balanced",
            n_jobs=-1,
            random_state=random_state,
            verbose=-1,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=150,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=random_state,
            n_jobs=-1,
        ),
    }


def train_candidate_models(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    models: Optional[Dict[str, Any]] = None,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Trains each candidate classification model and tracks training runtimes.

    Args:
        X_train: Preprocessed ML feature matrix (numeric + encoded categories).
        y_train: Binary target series (outbreak_next_week: 0 or 1).
        models: Optional dictionary of initialized estimator objects.
        random_state: Seed for stochastic algorithms.

    Returns:
        Dictionary of trained model estimators {model_name: fitted_estimator}.
    """
    if models is None:
        models = get_candidate_models(random_state=random_state)

    # Ensure y is 1D binary array
    if isinstance(y_train, pd.DataFrame):
        y_train = y_train.iloc[:, 0]
    y_train = np.asarray(y_train).ravel()

    fitted_models: Dict[str, Any] = {}
    log.info(f"Initiating training across {len(models)} candidate models on {len(X_train):,} records...")

    for name, model in models.items():
        log.info(f"Training [{name}]...")
        start_time = time.time()
        model.fit(X_train, y_train)
        elapsed = time.time() - start_time
        fitted_models[name] = model
        log.info(f"[{name}] trained successfully in {elapsed:.2f}s")

    return fitted_models
