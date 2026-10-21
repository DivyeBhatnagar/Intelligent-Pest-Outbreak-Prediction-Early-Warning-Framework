import argparse
from pathlib import Path
from typing import Dict, Any
import pandas as pd

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
from src.data.loader import (
    load_surveillance_data,
    load_reference_tables,
)
from src.data.preprocessor import clean_surveillance_data
from src.data.feature_engineering import build_surveillance_features
from src.data.split import (
    prepare_train_test_datasets,
    prepare_multi_pest_weather_datasets,
    prepare_smart_trap_datasets,
    prepare_regional_infestation_datasets,
)
from src.utils.logger import get_logger

log = get_logger("pipeline")


def run_data_pipeline(
    crop: str = "all",
    split_method: str = "temporal",
    split_year: int = 2006,
    test_size: float = 0.20,
    save: bool = True,
) -> Dict[str, Any]:
    """
    Executes the end-to-end data ingestion, cleaning, categorical encoding,
    bio-climatic feature engineering, and train/test dataset preparation workflow.
    """
    log.info(f"=== Launching Full Data Pipeline (crop='{crop}', split='{split_method}') ===")

    # 1. Load multi-source surveillance data (Rice ICAR + Cotton ICAR)
    raw_df = load_surveillance_data(crop=crop)

    # 2. Clean sensor noise, clip physical bounds, and impute missing values
    clean_df = clean_surveillance_data(raw_df)

    # 3. Generate bio-climatic features, GDD, VPD, cyclical SMW, and outbreak labels
    featured_df = build_surveillance_features(clean_df)

    # 4. Save consolidated clean dataset
    if save:
        surveillance_out = PROCESSED_DATA_DIR / "processed_surveillance.csv"
        featured_df.to_csv(surveillance_out, index=False)
        log.info(f"Saved processed surveillance dataset -> {surveillance_out} ({len(featured_df)} rows)")

    # 5. Categorical Encoding, Scaler fitting & Train/Test Dataset Preparation
    X_train, X_test, y_train, y_test, train_df, test_df = prepare_train_test_datasets(
        featured_df=featured_df,
        method=split_method,
        split_year=split_year,
        test_size=test_size,
        save=save,
    )

    # 6. Process Auxiliary Datasets
    log.info("Processing auxiliary project datasets...")
    multi_pest_train, multi_pest_test = prepare_multi_pest_weather_datasets(save=save)
    smart_trap_df = prepare_smart_trap_datasets(save=save)
    reg_train, reg_test = prepare_regional_infestation_datasets(save=save)

    # 7. Print comprehensive diagnostic summary
    train_outbreak = (y_train["outbreak_next_week"].mean() * 100) if "outbreak_next_week" in y_train.columns else 0.0
    test_outbreak = (y_test["outbreak_next_week"].mean() * 100) if "outbreak_next_week" in y_test.columns else 0.0

    print("\n" + "=" * 70)
    print("🌾 INTELLIGENT PEST OUTBREAK FRAMEWORK — DATASET PREPARATION SUMMARY")
    print("=" * 70)
    print(f"Total Consolidated Records     : {len(featured_df):,}")
    print(f"Crops Monitored                : {featured_df['crop'].unique().tolist()}")
    print(f"Unique Pest Species            : {featured_df['pest_name'].nunique()}")
    print(f"Geographic Locations (Stations): {featured_df['location'].nunique()} centers")
    print(f"Clean Missing Values (NaN)     : {featured_df.isna().sum().sum()} remaining (100% clean)")
    print("-" * 70)
    print("📦 PREPARED TRAINING & TESTING DATASETS")
    print("-" * 70)
    print(f"Split Strategy                 : {split_method.upper()} (Cutoff: year <= {split_year})" if split_method == "temporal" else f"Split Strategy: {split_method.upper()}")
    print(f"Training Observations (X_train): {len(X_train):,} rows ({len(X_train)/len(featured_df):.1%})")
    print(f"Testing Observations  (X_test) : {len(X_test):,} rows ({len(X_test)/len(featured_df):.1%})")
    print(f"ML Feature Dimensions          : {X_train.shape[1]} input columns (numeric + one-hot categories)")
    print(f"Train Outbreak Rate (t+1)      : {train_outbreak:.2f}%")
    print(f"Test Outbreak Rate (t+1)       : {test_outbreak:.2f}%")
    print("-" * 70)
    print("📂 GENERATED ARTIFACTS IN artifacts/processed/ & artifacts/models/")
    print("-" * 70)
    print(f" • Tabular Raw Train CSV       : {TRAIN_DATA_FILE.name} ({len(train_df):,} rows)")
    print(f" • Tabular Raw Test CSV        : {TEST_DATA_FILE.name} ({len(test_df):,} rows)")
    print(f" • Encoded ML X_train Matrix   : {X_TRAIN_FILE.name} / X_train.csv ({X_train.shape})")
    print(f" • Encoded ML X_test Matrix    : {X_TEST_FILE.name} / X_test.csv ({X_test.shape})")
    print(f" • Targets (y_train / y_test)  : y_train.csv / y_test.csv (binary, multiclass, regression)")
    print(f" • Preprocessor Pipeline       : {PREPROCESSOR_FILE.name} (ColumnTransformer/Scaler/OHE)")
    print(f" • Multi-Pest Weather Splits   : multi_pest_weather_train.csv ({len(multi_pest_train)}), test.csv ({len(multi_pest_test)})")
    print(f" • IoT Smart Trap Telemetry    : processed_smart_traps.csv ({len(smart_trap_df)} rows)")
    print(f" • Regional Infestation Splits : regional_infestations_train.csv ({len(reg_train)}), test.csv ({len(reg_test)})")
    print("=" * 70 + "\n")

    return {
        "featured_df": featured_df,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "train_df": train_df,
        "test_df": test_df,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pest Prediction End-to-End Data Pipeline")
    parser.add_argument(
        "--crop",
        type=str,
        default="all",
        choices=["all", "rice", "cotton"],
        help="Crop to process (default: all)",
    )
    parser.add_argument(
        "--split-method",
        type=str,
        default="temporal",
        choices=["temporal", "stratified"],
        help="Train/test split strategy (default: temporal)",
    )
    parser.add_argument(
        "--split-year",
        type=int,
        default=2006,
        help="Cutoff year for temporal train/test split (default: 2006)",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.20,
        help="Fraction of test split if method is stratified (default: 0.20)",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Skip saving output artifacts to disk",
    )
    args = parser.parse_args()

    run_data_pipeline(
        crop=args.crop,
        split_method=args.split_method,
        split_year=args.split_year,
        test_size=args.test_size,
        save=not args.no_save,
    )
