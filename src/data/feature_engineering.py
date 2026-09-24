from typing import List, Optional
import numpy as np
import pandas as pd

from src.config import BASE_TEMPERATURES, ECONOMIC_THRESHOLD_LEVELS
from src.utils.logger import get_logger

log = get_logger("data.features")


def compute_gdd(
    df: pd.DataFrame,
    temp_max_col: str = "temp_max",
    temp_min_col: str = "temp_min",
    pest_name_col: str = "pest_name"
) -> pd.Series:
    """
    Computes bio-climatic Growing Degree-Days (GDD) for insect development rates.
    Insects are cold-blooded; their life cycle stages (egg -> nymph -> adult)
    progress strictly based on thermal units accumulated above a base threshold.
    """
    # Mean ambient temperature
    t_mean = (df[temp_max_col] + df[temp_min_col]) / 2.0

    # Determine pest base threshold per row
    def get_base_temp(name):
        if pd.isna(name):
            return BASE_TEMPERATURES["default"]
        # Lookup sanitized or partial pest key
        for key, val in BASE_TEMPERATURES.items():
            if key.lower() in str(name).lower().replace(" ", ""):
                return val
        return BASE_TEMPERATURES["default"]

    if pest_name_col in df.columns:
        base_temps = df[pest_name_col].apply(get_base_temp)
    else:
        base_temps = BASE_TEMPERATURES["default"]

    # GDD = max(T_mean - T_base, 0)
    gdd = (t_mean - base_temps).clip(lower=0.0)
    return gdd.round(2)


def estimate_vapor_pressure_deficit(t_mean: pd.Series, rh_mean: pd.Series) -> pd.Series:
    """
    Approximates Vapor Pressure Deficit (VPD in kPa) using the Tetens formula.
    Low VPD combined with warm temperatures creates humid micro-climatic pockets
    under crop canopies where planthoppers and fungal pathogens thrive.
    """
    # Saturated vapor pressure (kPa)
    sat_vp = 0.61078 * np.exp((17.27 * t_mean) / (t_mean + 237.3))
    # Actual vapor pressure
    actual_vp = sat_vp * (rh_mean / 100.0)
    vpd = sat_vp - actual_vp
    return vpd.clip(lower=0.0).round(3)


def generate_temporal_lags(
    df: pd.DataFrame,
    feature_cols: List[str],
    lags: List[int] = [1, 2],
    group_cols: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Generates historical lag features (t-1, t-2 weeks) so the model has temporal
    memory of weather trends rather than just viewing a single point in time.
    """
    df_lagged = df.copy()

    for col in feature_cols:
        if col not in df_lagged.columns:
            continue

        for lag in lags:
            lag_name = f"{col}_lag{lag}"
            if group_cols and all(g in df_lagged.columns for g in group_cols):
                df_lagged[lag_name] = df_lagged.groupby(group_cols)[col].shift(lag)
            else:
                df_lagged[lag_name] = df_lagged[col].shift(lag)

            # Fill initial rows where lag is NaN with the current value
            df_lagged[lag_name] = df_lagged[lag_name].fillna(df_lagged[col])

    return df_lagged


def assign_outbreak_labels(
    df: pd.DataFrame,
    pest_count_col: str = "pest_count",
    pest_name_col: str = "pest_name"
) -> pd.DataFrame:
    """
    Assigns ground truth binary outbreak labels based on official Economic
    Threshold Levels (ETL) from agricultural extension manuals.
    Also produces a forward-looking label (outbreak in week t+1) for predictive lead time.
    """
    df_labeled = df.copy()

    def get_etl(name):
        if pd.isna(name):
            return ECONOMIC_THRESHOLD_LEVELS["default"]
        for key, val in ECONOMIC_THRESHOLD_LEVELS.items():
            if key.lower() in str(name).lower().replace(" ", ""):
                return val
        return ECONOMIC_THRESHOLD_LEVELS["default"]

    if pest_name_col in df_labeled.columns and pest_count_col in df_labeled.columns:
        etls = df_labeled[pest_name_col].apply(get_etl)
        
        # Binary target: 1 = At or above Economic Threshold, 0 = Below
        df_labeled["outbreak_current"] = (df_labeled[pest_count_col] >= etls).astype(int)

        # Risk severity tier (0: Negligible, 1: Moderate, 2: High, 3: Critical)
        ratios = df_labeled[pest_count_col] / np.maximum(etls, 0.1)
        conditions = [
            (ratios < 0.3),
            (ratios >= 0.3) & (ratios < 0.7),
            (ratios >= 0.7) & (ratios < 1.0),
            (ratios >= 1.0)
        ]
        df_labeled["risk_category"] = np.select(conditions, [0, 1, 2, 3], default=0)

        # Predictive Target: Outbreak 1 week in the future (t+1)
        group_keys = [c for c in ["location", "crop", "pest_name"] if c in df_labeled.columns]
        if group_keys:
            df_labeled["outbreak_next_week"] = df_labeled.groupby(group_keys)["outbreak_current"].shift(-1)
        else:
            df_labeled["outbreak_next_week"] = df_labeled["outbreak_current"].shift(-1)
        
        # For the final week in the record, fall back to current status
        df_labeled["outbreak_next_week"] = df_labeled["outbreak_next_week"].fillna(
            df_labeled["outbreak_current"]
        ).astype(int)

    return df_labeled


def build_surveillance_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main feature extraction pipeline for time-series pest surveillance records.
    Constructs thermal units (GDD), humidity indices, cyclical week features,
    and rolling lag vectors ready for training machine learning estimators.
    """
    log.info("Generating agronomic and bio-climatic features...")
    feat_df = df.copy()

    # 1. Thermal features & Diurnal Temperature Range (DTR)
    if "temp_max" in feat_df.columns and "temp_min" in feat_df.columns:
        feat_df["temp_mean"] = ((feat_df["temp_max"] + feat_df["temp_min"]) / 2.0).round(2)
        feat_df["diurnal_temp_range"] = (feat_df["temp_max"] - feat_df["temp_min"]).clip(lower=0.0).round(2)
        feat_df["gdd"] = compute_gdd(feat_df)

    # 2. Moisture, humidity, and micro-climate vapor indicators
    if "rh_morning" in feat_df.columns and "rh_evening" in feat_df.columns:
        feat_df["rh_mean"] = ((feat_df["rh_morning"] + feat_df["rh_evening"]) / 2.0).round(2)
        feat_df["rh_differential"] = (feat_df["rh_morning"] - feat_df["rh_evening"]).round(2)
        
        # High humidity persistence flag (>85% morning & >60% evening)
        feat_df["high_humidity_persistence"] = (
            (feat_df["rh_morning"] >= 85.0) & (feat_df["rh_evening"] >= 60.0)
        ).astype(int)

        if "temp_mean" in feat_df.columns:
            feat_df["vpd_kpa"] = estimate_vapor_pressure_deficit(feat_df["temp_mean"], feat_df["rh_mean"])

    # 3. Cyclical encoding for Standard Meteorological Week (1 to 52)
    # Allows tree and linear models to recognize week 52 and week 1 are adjacent
    if "standard_week" in feat_df.columns:
        week_num = feat_df["standard_week"]
        feat_df["week_sin"] = np.sin(2 * np.pi * week_num / 52.0).round(4)
        feat_df["week_cos"] = np.cos(2 * np.pi * week_num / 52.0).round(4)

    # 4. Lag features (1-week and 2-week history)
    lag_candidates = [
        col for col in ["temp_mean", "rh_mean", "rainfall", "gdd", "pest_count"]
        if col in feat_df.columns
    ]
    group_keys = [c for c in ["location", "crop", "pest_name"] if c in feat_df.columns]
    feat_df = generate_temporal_lags(feat_df, feature_cols=lag_candidates, lags=[1, 2], group_cols=group_keys)

    # 5. Outbreak and risk ground truth labels
    feat_df = assign_outbreak_labels(feat_df)

    log.info(f"Feature engineering complete. Total feature columns: {len(feat_df.columns)}")
    return feat_df
