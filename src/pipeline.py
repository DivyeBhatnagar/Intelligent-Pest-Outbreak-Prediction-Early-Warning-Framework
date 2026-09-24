import argparse
from pathlib import Path
import pandas as pd

from src.config import PROCESSED_DATA_DIR
from src.data.loader import (
    load_surveillance_data,
    load_dataset,
    load_smart_trap_data,
    load_reference_tables,
)
from src.data.preprocessor import clean_surveillance_data, handle_missing_values
from src.data.feature_engineering import build_surveillance_features, compute_gdd
from src.utils.logger import get_logger

log = get_logger("pipeline")


def run_data_pipeline(crop: str = "all", save: bool = True) -> pd.DataFrame:
    """
    Executes the end-to-end data ingestion, cleaning, and feature engineering
    workflow across all target datasets.
    """
    log.info(f"--- Launching Data Pipeline for crop='{crop}' ---")

    # 1. Load multi-source surveillance data (Rice + Cotton)
    raw_df = load_surveillance_data(crop=crop)

    # 2. Clean noise, sensor clip, and impute
    clean_df = clean_surveillance_data(raw_df)

    # 3. Generate bio-meteorological features & outbreak labels
    featured_df = build_surveillance_features(clean_df)

    # 4. Also inspect and preprocess Multi-Pest Weather dataset
    log.info("Processing Multi-Pest Weather dataset...")
    multi_pest_raw = load_dataset("multi_pest_weather")
    # Rename weather columns to standard names
    multi_pest_clean = handle_missing_values(multi_pest_raw)
    
    # 5. Load and summarize Smart Trap telemetry
    log.info("Processing IoT Smart Trap telemetry...")
    smart_trap_df = load_smart_trap_data()

    # 6. Save processed datasets if requested
    if save:
        surveillance_out = PROCESSED_DATA_DIR / "processed_surveillance.csv"
        featured_df.to_csv(surveillance_out, index=False)
        log.info(f"Saved processed surveillance dataset -> {surveillance_out} ({len(featured_df)} rows)")

        trap_out = PROCESSED_DATA_DIR / "processed_smart_traps.csv"
        smart_trap_df.to_csv(trap_out, index=False)
        log.info(f"Saved processed smart trap dataset -> {trap_out} ({len(smart_trap_df)} rows)")

    # Print summary diagnostics
    print("\n" + "=" * 65)
    print("📊 DATASET PIPELINE DIAGNOSTIC SUMMARY")
    print("=" * 65)
    print(f"Total Surveillance Records : {len(featured_df):,}")
    print(f"Crops Represented          : {featured_df['crop'].unique().tolist()}")
    print(f"Pests Monitored            : {featured_df['pest_name'].nunique()} unique species")
    print(f"Top 5 Pests                : {featured_df['pest_name'].value_counts().head(5).to_dict()}")
    
    if "outbreak_next_week" in featured_df.columns:
        outbreak_counts = featured_df["outbreak_next_week"].value_counts().to_dict()
        outbreak_rate = (featured_df["outbreak_next_week"].mean() * 100)
        print(f"Outbreak Label Distribution: 0 (Normal): {outbreak_counts.get(0, 0):,}, 1 (Outbreak): {outbreak_counts.get(1, 0):,}")
        print(f"Outbreak Class Rate (t+1)  : {outbreak_rate:.2f}%")

    print(f"Smart Trap Telemetry Rows  : {len(smart_trap_df):,}")
    print(f"Engineered Feature Columns : {len(featured_df.columns)}")
    print("=" * 65 + "\n")

    return featured_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pest Prediction Data Pipeline")
    parser.add_argument(
        "--crop",
        type=str,
        default="all",
        choices=["all", "rice", "cotton"],
        help="Crop to process (default: all)",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Skip saving output CSVs to disk",
    )
    args = parser.parse_args()

    run_data_pipeline(crop=args.crop, save=not args.no_save)
