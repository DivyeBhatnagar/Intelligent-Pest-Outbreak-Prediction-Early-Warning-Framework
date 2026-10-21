from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder, StandardScaler, OrdinalEncoder

from src.config import MODELS_DIR
from src.utils.logger import get_logger

log = get_logger("data.encoder")


class SurveillanceDataPreprocessor:
    """
    Production-grade preprocessor and categorical encoder for agricultural
    surveillance and bio-climatic features.
    
    Transforms raw tabular data into:
    1. Fully One-Hot Encoded feature matrix (for Linear, SVM, MLP, XGBoost, and SHAP)
    2. Scaled feature matrix (StandardScaler fitted strictly on training data)
    3. Ordinal integer encoded columns (for native categorical tree models like LightGBM)
    """

    CATEGORICAL_COLUMNS = [
        "crop",
        "pest_name",
        "location",
        "life_stage",
        "collection_type",
    ]

    NUMERICAL_COLUMNS = [
        "temp_max",
        "temp_min",
        "temp_mean",
        "diurnal_temp_range",
        "rh_morning",
        "rh_evening",
        "rh_mean",
        "rh_differential",
        "high_humidity_persistence",
        "rainfall",
        "wind_speed",
        "sunshine_hours",
        "evaporation",
        "vpd_kpa",
        "gdd",
        "standard_week",
        "week_sin",
        "week_cos",
        "pest_count",
        "outbreak_current",
        "temp_mean_lag1",
        "temp_mean_lag2",
        "rh_mean_lag1",
        "rh_mean_lag2",
        "rainfall_lag1",
        "rainfall_lag2",
        "gdd_lag1",
        "gdd_lag2",
        "pest_count_lag1",
        "pest_count_lag2",
    ]

    TARGET_COLUMNS = [
        "outbreak_next_week",
        "risk_category",
        "pest_count",
    ]

    def __init__(self, scale_numeric: bool = True):
        self.scale_numeric = scale_numeric
        self.ohe = OneHotEncoder(
            sparse_output=False,
            handle_unknown="ignore",
        )
        self.ordinal_encoder = OrdinalEncoder(
            handle_unknown="use_encoded_value",
            unknown_value=-1,
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_names_: List[str] = []
        self.cat_columns_: List[str] = []
        self.num_columns_: List[str] = []
        self.categories_map_: Dict[str, List[str]] = {}

    def fit(self, df: pd.DataFrame) -> "SurveillanceDataPreprocessor":
        """
        Fits encoders and scalers strictly on the training dataframe.
        """
        log.info("Fitting categorical encoders and numeric scalers on training split...")
        
        # Determine available categorical and numerical columns
        self.cat_columns_ = [c for c in self.CATEGORICAL_COLUMNS if c in df.columns]
        self.num_columns_ = [c for c in self.NUMERICAL_COLUMNS if c in df.columns]

        if not self.cat_columns_:
            raise ValueError(f"None of the expected categorical columns {self.CATEGORICAL_COLUMNS} found in dataframe.")

        # Fit One-Hot Encoder and Ordinal Encoder
        cat_data = df[self.cat_columns_].astype(str)
        self.ohe.fit(cat_data)
        self.ordinal_encoder.fit(cat_data)

        # Store categories map for inspection and API schema reference
        for col, categories in zip(self.cat_columns_, self.ohe.categories_):
            self.categories_map_[col] = [str(c) for c in categories]

        # Generate OHE feature names
        ohe_feature_names = self.ohe.get_feature_names_out(self.cat_columns_).tolist()

        # Fit Scaler on numerical features
        if self.scale_numeric and self.num_columns_:
            self.scaler.fit(df[self.num_columns_].values)

        self.feature_names_ = self.num_columns_ + ohe_feature_names
        self.is_fitted = True
        log.info(
            f"Fitted preprocessor successfully. Total features generated: {len(self.feature_names_)} "
            f"({len(self.num_columns_)} numeric, {len(ohe_feature_names)} one-hot categories)"
        )
        return self

    def transform(
        self,
        df: pd.DataFrame,
        return_df: bool = True,
    ) -> Union[pd.DataFrame, np.ndarray]:
        """
        Transforms input dataframe into ML-ready feature matrix using fitted encoders.
        """
        if not self.is_fitted:
            raise RuntimeError("Preprocessor has not been fitted yet. Call fit() first.")

        # 1. Transform categoricals via One-Hot Encoding
        cat_data = df[self.cat_columns_].astype(str)
        cat_encoded = self.ohe.transform(cat_data)

        # 2. Transform numerics
        if self.num_columns_:
            num_data = df[self.num_columns_].values
            if self.scale_numeric:
                num_scaled = self.scaler.transform(num_data)
            else:
                num_scaled = num_data
        else:
            num_scaled = np.empty((len(df), 0))

        # 3. Concatenate numerics and OHE categories
        X_all = np.hstack([num_scaled, cat_encoded])

        if return_df:
            return pd.DataFrame(X_all, columns=self.feature_names_, index=df.index)
        return X_all

    def fit_transform(
        self,
        df: pd.DataFrame,
        return_df: bool = True,
    ) -> Union[pd.DataFrame, np.ndarray]:
        """
        Fits on df and transforms it in a single step.
        """
        return self.fit(df).transform(df, return_df=return_df)

    def add_ordinal_encoded_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Appends integer label codes for each categorical column directly into the dataframe.
        Useful for LightGBM/CatBoost or tree models that use native integer category types.
        """
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted first.")
        
        df_out = df.copy()
        cat_data = df_out[self.cat_columns_].astype(str)
        ordinal_vals = self.ordinal_encoder.transform(cat_data)

        for idx, col in enumerate(self.cat_columns_):
            code_col = f"{col}_code"
            df_out[code_col] = ordinal_vals[:, idx].astype(int)

        return df_out

    def save(self, file_path: Union[str, Path] = None) -> Path:
        """
        Serializes the fitted preprocessor pipeline to disk with joblib.
        """
        if not self.is_fitted:
            raise RuntimeError("Cannot save unfitted preprocessor.")
        
        target_path = Path(file_path) if file_path else MODELS_DIR / "preprocessor.joblib"
        target_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, target_path)
        log.info(f"Saved fitted preprocessor pipeline to {target_path}")

        # Also write a lightweight metadata JSON for API and inspection
        metadata_path = target_path.parent / "feature_metadata.json"
        metadata = {
            "total_features": len(self.feature_names_),
            "numerical_columns": self.num_columns_,
            "categorical_columns": self.cat_columns_,
            "categories_map": self.categories_map_,
            "feature_names": self.feature_names_,
            "scale_numeric": self.scale_numeric,
        }
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        log.info(f"Saved feature metadata JSON to {metadata_path}")

        return target_path

    @classmethod
    def load(cls, file_path: Union[str, Path]) -> "SurveillanceDataPreprocessor":
        """
        Loads serialized preprocessor from disk.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Preprocessor file not found at: {path}")
        instance = joblib.load(path)
        log.info(f"Loaded preprocessor pipeline from {path} ({len(instance.feature_names_)} features)")
        return instance
