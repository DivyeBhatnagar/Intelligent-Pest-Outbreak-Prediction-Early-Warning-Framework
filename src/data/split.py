from pathlib import Path
from typing import Dict, Optional, Tuple
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from src.config import (
    PROCESSED_DATA_DIR,
    TRAIN_DATA_FILE,
    TEST_DATA_FILE,
    X_TRAIN_FILE,
    X_TEST_FILE,
    Y_TRAIN_FILE,
    Y_TEST_FILE,
    PREPROCESSOR_FILE,
)
from src.data.encoder import SurveillanceDataPreprocessor
from src.data.loader import (
    load_multi_pest_weather,
    load_smart_trap_data,
    load_regional_infestations,
)
from src.data.preprocessor import handle_missing_values, sanitize_pest_name
from src.data.feature_engineering import estimate_vapor_pressure_deficit
from src.utils.logger import get_logger

log = get_logger("data.split")


def prepare_train_test_datasets(
    featured_df: pd.DataFrame,
    method: str = "temporal",
    split_year: int = 2006,
    test_size: float = 0.20,
    random_state: int = 42,
    save: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Splits the consolidated surveillance dataset into training and testing sets,
    encodes all categorical features, scales numerical signals, and saves all
    resulting ML-ready matrices.

    Args:
        featured_df: Cleaned and feature-engineered surveillance dataframe.
        method: 'temporal' (split chronologically by year) or 'stratified' (random 80/20 stratified on outbreak label).
        split_year: Cutoff year for temporal split (records <= split_year are train, > split_year are test).
        test_size: Fraction of test split if method is 'stratified'.
        random_state: Random seed for reproducibility.
        save: If True, writes files to artifacts/processed/ and artifacts/models/.

    Returns:
        (X_train, X_test, y_train, y_test, train_raw, test_raw)
    """
    log.info(f"Splitting dataset using method='{method}'...")

    # 1. Perform dataset split
    if method == "temporal":
        if "year" not in featured_df.columns:
            raise KeyError("Column 'year' required for temporal split.")
        train_raw = featured_df[featured_df["year"] <= split_year].copy().reset_index(drop=True)
        test_raw = featured_df[featured_df["year"] > split_year].copy().reset_index(drop=True)
        log.info(
            f"Temporal Split at year {split_year}: Train={len(train_raw)} (<= {split_year}), "
            f"Test={len(test_raw)} (> {split_year})"
        )
    elif method == "stratified":
        target = featured_df["outbreak_next_week"] if "outbreak_next_week" in featured_df.columns else None
        train_raw, test_raw = train_test_split(
            featured_df,
            test_size=test_size,
            stratify=target,
            random_state=random_state,
        )
        train_raw = train_raw.reset_index(drop=True)
        test_raw = test_raw.reset_index(drop=True)
        log.info(
            f"Stratified Split: Train={len(train_raw)} ({1-test_size:.0%}), "
            f"Test={len(test_raw)} ({test_size:.0%})"
        )
    else:
        raise ValueError(f"Unknown split method: {method}. Choose 'temporal' or 'stratified'.")

    # 2. Fit preprocessor strictly on train_raw to prevent data leakage
    preprocessor = SurveillanceDataPreprocessor(scale_numeric=True)
    preprocessor.fit(train_raw)

    # 3. Transform train and test splits into encoded & scaled feature matrices
    X_train = preprocessor.transform(train_raw, return_df=True)
    X_test = preprocessor.transform(test_raw, return_df=True)

    # 4. Also add ordinal integer category columns to human-readable raw splits
    train_raw = preprocessor.add_ordinal_encoded_columns(train_raw)
    test_raw = preprocessor.add_ordinal_encoded_columns(test_raw)

    # 5. Extract target matrices
    target_cols = [c for c in ["outbreak_next_week", "risk_category", "pest_count"] if c in featured_df.columns]
    y_train = train_raw[target_cols].copy()
    y_test = test_raw[target_cols].copy()

    # 6. Save outputs if requested
    if save:
        log.info("Persisting train and test datasets to disk...")
        PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

        # Full tabular records (features + targets + ordinal codes)
        train_raw.to_csv(TRAIN_DATA_FILE, index=False)
        test_raw.to_csv(TEST_DATA_FILE, index=False)
        log.info(f"Saved {TRAIN_DATA_FILE} ({len(train_raw)} rows)")
        log.info(f"Saved {TEST_DATA_FILE} ({len(test_raw)} rows)")

        # Encoded ML feature matrices (Parquet for fast typed I/O and CSV for universal compatibility)
        try:
            X_train.to_parquet(X_TRAIN_FILE, index=False)
            X_test.to_parquet(X_TEST_FILE, index=False)
            log.info(f"Saved {X_TRAIN_FILE} and {X_TEST_FILE}")
        except Exception:
            pass
        
        # Also save CSV versions of X matrices
        X_train.to_csv(PROCESSED_DATA_DIR / "X_train.csv", index=False)
        X_test.to_csv(PROCESSED_DATA_DIR / "X_test.csv", index=False)

        # Targets
        y_train.to_csv(Y_TRAIN_FILE, index=False)
        y_test.to_csv(Y_TEST_FILE, index=False)
        log.info(f"Saved {Y_TRAIN_FILE} and {Y_TEST_FILE}")

        # Serialized preprocessor pipeline and metadata
        preprocessor.save(PREPROCESSOR_FILE)

    return X_train, X_test, y_train, y_test, train_raw, test_raw


def prepare_multi_pest_weather_datasets(save: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Cleans, engineers, encodes, and splits the Multi-Pest Weather surveillance dataset.
    Predicts pest species based on prevailing micro-climatic weather patterns.
    """
    log.info("Preparing Multi-Pest Weather dataset...")
    df = load_multi_pest_weather()
    df = handle_missing_values(df)

    # Sanitize pest names
    if "pest_name" in df.columns:
        df["pest_name"] = df["pest_name"].apply(sanitize_pest_name)
    elif "Pest" in df.columns:
        df["pest_name"] = df["Pest"].apply(sanitize_pest_name)
        df = df.drop(columns=["Pest"])

    # Bio-climatic feature calculations
    if "temp_max" in df.columns and "temp_min" in df.columns:
        df["temp_mean"] = ((df["temp_max"] + df["temp_min"]) / 2.0).round(2)
        df["diurnal_temp_range"] = (df["temp_max"] - df["temp_min"]).clip(lower=0.0).round(2)

    if "rh_morning" in df.columns and "rh_evening" in df.columns:
        df["rh_mean"] = ((df["rh_morning"] + df["rh_evening"]) / 2.0).round(2)
        df["rh_differential"] = (df["rh_morning"] - df["rh_evening"]).round(2)
        if "temp_mean" in df.columns:
            df["vpd_kpa"] = estimate_vapor_pressure_deficit(df["temp_mean"], df["rh_mean"])

    # Encode target pest label
    le = LabelEncoder()
    df["pest_target_code"] = le.fit_transform(df["pest_name"])

    # Split into train and test (80/20 stratified on pest species)
    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        stratify=df["pest_target_code"],
        random_state=42,
    )
    train_df = train_df.reset_index(drop=True)
    test_df = test_df.reset_index(drop=True)

    if save:
        out_train = PROCESSED_DATA_DIR / "multi_pest_weather_train.csv"
        out_test = PROCESSED_DATA_DIR / "multi_pest_weather_test.csv"
        train_df.to_csv(out_train, index=False)
        test_df.to_csv(out_test, index=False)
        log.info(f"Saved Multi-Pest Weather splits -> {out_train.name} ({len(train_df)}), {out_test.name} ({len(test_df)})")

    return train_df, test_df


def prepare_smart_trap_datasets(save: bool = True) -> pd.DataFrame:
    """
    Cleans and preprocesses IoT electronic smart trap insect catch telemetry.
    """
    log.info("Preparing IoT Smart Trap dataset...")
    df = load_smart_trap_data()
    df = handle_missing_values(df)

    # Encode location if present
    if "location" in df.columns:
        df["location_code"] = LabelEncoder().fit_transform(df["location"].astype(str))

    if save:
        out_file = PROCESSED_DATA_DIR / "processed_smart_traps.csv"
        df.to_csv(out_file, index=False)
        log.info(f"Saved processed Smart Trap telemetry -> {out_file.name} ({len(df)} rows)")

    return df


def prepare_regional_infestation_datasets(save: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Cleans, encodes categorical features, and prepares train/test splits for
    the Historical Regional Pest Infestation dataset.
    """
    log.info("Preparing Historical Regional Pest Infestation dataset...")
    df = load_regional_infestations()
    df = handle_missing_values(df)

    # Map ordinal severity levels
    severity_map = {"Low": 0, "Medium": 1, "High": 2}
    if "infestation_level" in df.columns:
        df["severity_code"] = df["infestation_level"].map(severity_map).fillna(0).astype(int)

    # Encode categorical columns
    cat_cols = ["pest", "life_cycle_stage", "crop_affected", "state", "season"]
    for col in cat_cols:
        if col in df.columns:
            df[f"{col}_code"] = LabelEncoder().fit_transform(df[col].astype(str))

    # Split 80/20 stratified by severity
    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        stratify=df["severity_code"] if "severity_code" in df.columns else None,
        random_state=42,
    )
    train_df = train_df.reset_index(drop=True)
    test_df = test_df.reset_index(drop=True)

    if save:
        out_train = PROCESSED_DATA_DIR / "regional_infestations_train.csv"
        out_test = PROCESSED_DATA_DIR / "regional_infestations_test.csv"
        train_df.to_csv(out_train, index=False)
        test_df.to_csv(out_test, index=False)
        log.info(f"Saved Regional Infestation splits -> {out_train.name} ({len(train_df)}), {out_test.name} ({len(test_df)})")

    return train_df, test_df
