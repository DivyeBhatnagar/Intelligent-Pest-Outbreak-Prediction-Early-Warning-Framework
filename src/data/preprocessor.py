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
    Cleans up noisy pest names from different data collection rounds and sources.
    Maps historical synonyms and abbreviations to standard scientific/common forms.
    """
    if pd.isna(name):
        return "Unknown"
    
    clean = str(name).strip()
    # Strip collection suffixes like ' - LT' (Light Trap) or ' - PT' (Pheromone Trap)
    clean = re.sub(r"\s*-\s*[A-Z]{2}\s*$", "", clean)
    clean = clean.replace("_", " ").strip()
    
    # Capitalize standard forms
    mapping = {
        "brownplanthopper": "Brown Planthopper",
        "yellowstemborer": "Yellow Stem Borer",
        "leaffolder": "Leaf Folder",
        "whitebackedplanthopper": "White Backed Planthopper",
        "greenleafhopper": "Green Leafhopper",
        "greenleafhoper": "Green Leafhopper",
        "gallmidge": "Gall Midge",
        "caseworm": "Caseworm",
        "miridbug": "Mirid Bug",
        "zigzagleafhopper": "Zigzag Leafhopper",
        "leafblast": "Leaf Blast",
        "neckblast": "Neck Blast",
        "americanbollworm": "American Bollworm",
        "pinkbollworm": "Pink Bollworm",
        "spottedbollworm": "Spotted Bollworm",
        "bollworm": "American Bollworm",
        "whitefly": "Whitefly",
        "aphid": "Aphid",
        "aphids": "Aphid",
        "jassid": "Jassid",
        "jassids": "Jassid",
        "thrips": "Thrips",
        "spodoptera": "Spodoptera",
        "mealybug": "Mealybug",
        "bacterialeafblight": "Bacterial Leaf Blight",
        "alternarialeafblight": "Alternaria Leaf Blight",
        "alternarialeafspot": "Alternaria Leaf Spot",
    }
    key = clean.lower().replace(" ", "").replace("-", "")
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
    Handles missing telemetry values without distorting agricultural signals:
    1. For pest counts: forward-fills and back-fills within the field/season group,
       then imputes any remaining NaNs (e.g. pre-sowing period) with 0.0.
    2. For environmental/weather variables: applies time-series forward/backward fill
       within station/year groups, then fills remaining gaps with column medians.
    3. For categoricals: fills missing values with 'Unknown'.
    """
    df_clean = df.copy()

    # Numerical columns
    num_cols = df_clean.select_dtypes(include=[np.number]).columns.tolist()

    # 1. Weather and environmental columns
    weather_cols = [
        c for c in [
            "temp_max", "temp_min", "rh_morning", "rh_evening",
            "rainfall", "wind_speed", "sunshine_hours", "evaporation"
        ] if c in df_clean.columns
    ]

    # Time-series local forward fill for weather inside location + year if available
    loc_year_group = [c for c in ["location", "year"] if c in df_clean.columns]
    if loc_year_group and weather_cols:
        df_clean[weather_cols] = df_clean.groupby(loc_year_group)[weather_cols].transform(
            lambda grp: grp.ffill().bfill()
        )

    # 2. Pest count column
    if "pest_count" in df_clean.columns:
        pest_group = [c for c in ["location", "year", "crop", "pest_name"] if c in df_clean.columns]
        if pest_group:
            df_clean["pest_count"] = df_clean.groupby(pest_group)["pest_count"].transform(
                lambda grp: grp.ffill().bfill()
            )
        # Any remaining NaNs in pest count (e.g. off-season non-planted weeks) are safely 0.0
        df_clean["pest_count"] = df_clean["pest_count"].fillna(0.0)

    # 3. Global median fallback for any remaining numerical gaps
    for col in num_cols:
        if col != "pest_count" and df_clean[col].isna().any():
            median_val = df_clean[col].median()
            median_val = 0.0 if pd.isna(median_val) else median_val
            df_clean[col] = df_clean[col].fillna(median_val)

    # 4. Categorical columns
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

    # Clean life stage
    if "life_stage" in cleaned.columns:
        cleaned["life_stage"] = cleaned["life_stage"].fillna("All").astype(str).str.strip().str.title()

    # Clean collection type
    if "collection_type" in cleaned.columns:
        cleaned["collection_type"] = cleaned["collection_type"].fillna("Unknown").astype(str).str.strip()

    # Standard week must be integer between 1 and 53
    if "standard_week" in cleaned.columns:
        cleaned["standard_week"] = pd.to_numeric(cleaned["standard_week"], errors="coerce")
        cleaned["standard_week"] = cleaned["standard_week"].clip(lower=1, upper=53).fillna(1).astype(int)

    # Observation Year validation
    if "year" in cleaned.columns:
        cleaned["year"] = pd.to_numeric(cleaned["year"], errors="coerce")
        cleaned["year"] = cleaned["year"].fillna(2000).astype(int)

    # Outlier detection
    cleaned = remove_sensor_outliers(cleaned)

    # Impute missing values with group awareness
    group_keys = [c for c in ["location", "crop", "pest_name", "year"] if c in cleaned.columns]
    cleaned = handle_missing_values(cleaned, group_cols=group_keys if group_keys else None)

    # Ensure non-negative pest counts
    if "pest_count" in cleaned.columns:
        cleaned["pest_count"] = cleaned["pest_count"].clip(lower=0.0)

    log.info(f"Cleaned surveillance records: {len(cleaned)} rows preserved (0 nulls remaining)")
    return cleaned
