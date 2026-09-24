import re
from typing import List, Optional
import numpy as np
import pandas as pd

from src.utils.logger import get_logger

log = get_logger("data.preprocessor")

# Expected environmental physical ranges for sanity checks
PHYSICAL_BOUNDS = {
    "temp_max": (-5.0, 55.0),       # Deg C
    "temp_min": (-10.0, 45.0),      # Deg C
    "rh_morning": (5.0, 100.0),     # %
    "rh_evening": (5.0, 100.0),     # %
    "rainfall": (0.0, 600.0),       # mm in a single day/week
    "wind_speed": (0.0, 120.0),     # km/h
    "sunshine_hours": (0.0, 16.0),  # Max astronomical daylight in tropics
    "evaporation": (0.0, 50.0),     # mm
    "pest_count": (0.0, 100000.0),  # Non-negative counts
}


def sanitize_pest_name(name: Optional[str]) -> str:
    """
    Cleans up noisy pest names from different data collection rounds.
    E.g., 'Yellowstemborer - LT ' -> 'Yellow Stem Borer'
    """
    if pd.isna(name):
        return "Unknown"
    
    clean = str(name).strip()
    # Strip collection suffixes often found in trap reports like ' - LT' (Light Trap) or ' - PT' (Pheromone Trap)
    clean = re.sub(r"\s*-\s*[A-Z]{2}\s*$", "", clean)
    clean = clean.replace("_", " ").strip()
    
    # Capitalize standard forms
    mapping = {
        "brownplanthopper": "Brown Planthopper",
        "yellowstemborer": "Yellow Stem Borer",
        "leaffolder": "Leaf Folder",
        "whitebackedplanthopper": "White Backed Planthopper",
        "greenleafhoper": "Green Leafhopper",
        "gallmidge": "Gall Midge",
        "caseworm": "Caseworm",
        "miridbug": "Mirid Bug",
        "bollworm": "Bollworm",
        "pink bollworm": "Pink Bollworm",
        "whitefly": "Whitefly",
        "aphids": "Aphids",
        "jassids": "Jassids",
        "thrips": "Thrips",
    }
    key = clean.lower().replace(" ", "")
    return mapping.get(key, clean.title())


def remove_sensor_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Filters out physically impossible telemetry readings caused by dead sensors,
    transmission errors, or bad OCR scans (e.g. 250 deg C temp, negative rainfall).
    Replaces out-of-bound values with NaN so imputation can repair them smoothly.
    """
    df_clean = df.copy()
    outlier_counts = {}

    for col, (low, high) in PHYSICAL_BOUNDS.items():
        if col in df_clean.columns and np.issubdtype(df_clean[col].dtype, np.number):
            mask = (df_clean[col] < low) | (df_clean[col] > high)
            count = int(mask.sum())
            if count > 0:
                outlier_counts[col] = count
                df_clean.loc[mask, col] = np.nan

    if outlier_counts:
        log.warning(f"Sensor outliers clipped to NaN: {outlier_counts}")
    return df_clean


def handle_missing_values(
    df: pd.DataFrame,
    group_cols: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Handles missing telemetry values without distorting agricultural signals.
    - If group_cols (e.g., ['location', 'pest_name']) is provided, forwards fills
      within the locality time-series first.
    - Fills remaining numerical NaNs with column medians.
    - Categoricals get filled with 'Unknown'.
    """
    df_clean = df.copy()

    # Numerical columns
    num_cols = df_clean.select_dtypes(include=[np.number]).columns.tolist()
    
    if group_cols and all(col in df_clean.columns for col in group_cols):
        # Time-series local forward fill inside the same field / station
        df_clean[num_cols] = df_clean.groupby(group_cols)[num_cols].transform(
            lambda grp: grp.ffill().bfill()
        )

    # Global median fallback for any remaining gap
    for col in num_cols:
        if df_clean[col].isna().any():
            median_val = df_clean[col].median()
            # If everything was NaN, default to zero
            median_val = 0.0 if pd.isna(median_val) else median_val
            df_clean[col] = df_clean[col].fillna(median_val)

    # Categorical columns
    cat_cols = df_clean.select_dtypes(exclude=[np.number]).columns.tolist()
    for col in cat_cols:
        df_clean[col] = df_clean[col].fillna("Unknown")

    return df_clean


def clean_surveillance_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full preprocessing pass for agricultural pest surveillance records (Rice, Cotton).
    Standardizes names, cleans out-of-range sensor noise, and imputes missing fields.
    """
    log.info("Starting surveillance data cleaning...")
    cleaned = df.copy()

    # Normalize pest names
    if "pest_name" in cleaned.columns:
        cleaned["pest_name"] = cleaned["pest_name"].apply(sanitize_pest_name)

    # Standard week must be integer between 1 and 53
    if "standard_week" in cleaned.columns:
        cleaned["standard_week"] = pd.to_numeric(cleaned["standard_week"], errors="coerce")
        cleaned["standard_week"] = cleaned["standard_week"].clip(lower=1, upper=53).fillna(1).astype(int)

    # Outlier detection
    cleaned = remove_sensor_outliers(cleaned)

    # Impute missing values with group awareness where possible
    group_keys = [c for c in ["location", "crop", "pest_name"] if c in cleaned.columns]
    cleaned = handle_missing_values(cleaned, group_cols=group_keys if group_keys else None)

    # Ensure non-negative pest counts
    if "pest_count" in cleaned.columns:
        cleaned["pest_count"] = cleaned["pest_count"].clip(lower=0.0)

    log.info(f"Cleaned surveillance records: {len(cleaned)} rows preserved")
    return cleaned
