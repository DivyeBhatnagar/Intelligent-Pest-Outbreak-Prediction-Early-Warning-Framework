from pathlib import Path
from typing import Dict, Optional, Union
import pandas as pd

from src.config import DATASETS, COLUMN_MAPPINGS
from src.utils.logger import get_logger

log = get_logger("data.loader")


def load_dataset(dataset_key: str) -> pd.DataFrame:
    """
    Fetch raw dataframe by dataset key from config.
    Handles both CSV and Excel sources with encoding fallbacks.
    """
    if dataset_key not in DATASETS:
        raise KeyError(
            f"Unknown dataset key '{dataset_key}'. Available: {list(DATASETS.keys())}"
        )

    file_path: Path = DATASETS[dataset_key]
    if not file_path.exists():
        raise FileNotFoundError(f"Target file does not exist at: {file_path}")

    log.info(f"Loading '{dataset_key}' from {file_path.name}...")

    # Route based on extension
    if file_path.suffix in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
    else:
        try:
            df = pd.read_csv(file_path)
        except UnicodeDecodeError:
            # Fallback for regional export quirks or Latin-1 chars in reports
            df = pd.read_csv(file_path, encoding="latin1")

    log.info(f"Loaded '{dataset_key}' ({len(df)} rows, {len(df.columns)} cols)")
    return df


def load_surveillance_data(crop: str = "all") -> pd.DataFrame:
    """
    Loads historical weekly field surveillance records (Rice ICAR, Cotton ICAR).
    Harmonizes columns into a standard schema so downstream ML sees consistent features.
    """
    dfs = []
    crop_filter = crop.lower().strip()

    # 1. Rice surveillance
    if crop_filter in ["all", "rice"]:
        rice_df = load_dataset("rice_icar")
        # Standardize column headers
        rice_df = rice_df.rename(columns=COLUMN_MAPPINGS)
        rice_df["crop"] = "Rice"
        dfs.append(rice_df)

    # 2. Cotton surveillance
    if crop_filter in ["all", "cotton"]:
        cotton_df = load_dataset("cotton_icar")
        cotton_df = cotton_df.rename(columns=COLUMN_MAPPINGS)
        cotton_df["crop"] = "Cotton"
        dfs.append(cotton_df)

    if not dfs:
        raise ValueError(f"No surveillance data available for crop filter: '{crop}'")

    combined = pd.concat(dfs, ignore_index=True)
    log.info(f"Consolidated surveillance data: {len(combined)} records across {combined['crop'].unique()}")
    return combined


def load_smart_trap_data() -> pd.DataFrame:
    """
    Loads automated electronic insect trap telemetry with weather readings.
    Parses timestamp columns for high-frequency timeseries analysis.
    """
    df = load_dataset("smart_trap")
    
    # Clean up column headers (lowercase + strip spaces)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Combine date and time if present
    if "date" in df.columns and "time" in df.columns:
        df["timestamp"] = pd.to_datetime(
            df["date"].astype(str) + " " + df["time"].astype(str),
            errors="coerce"
        )
        df = df.sort_values("timestamp").reset_index(drop=True)
    
    return df


def load_reference_tables() -> Dict[str, pd.DataFrame]:
    """
    Loads static advisory references: TNAU thresholds, IPM guidelines, and crop phenologies.
    These are used by the risk engine and explainability layer for actionable insights.
    """
    return {
        "tnau_thresholds": load_dataset("tnau_thresholds"),
        "ipm_thresholds": load_dataset("ipm_thresholds"),
        "crop_phenology": load_dataset("crop_phenology"),
        "regional_infestations": load_dataset("regional_infestations"),
    }
