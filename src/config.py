import os
from pathlib import Path

# Base directories
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "Dataset"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
PROCESSED_DATA_DIR = ARTIFACTS_DIR / "processed"
MODELS_DIR = ARTIFACTS_DIR / "models"

# Make sure runtime directories exist
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Dataset paths
DATASETS = {
    # Time-series weekly surveillance
    "rice_icar": DATA_DIR / "RICE.csv",
    "cotton_icar": DATA_DIR / "Cotton_ICAR_Data.xlsx",
    
    # Weather-pest multi-class observations
    "multi_pest_weather": DATA_DIR / "Multi_Pest_Weather_Surveillance.csv",
    
    # IoT sensor & trap timeseries
    "smart_trap": DATA_DIR / "Smart_Trap_Insect_Catch_Timeseries.csv",
    
    # Reference tables & ETL guidelines
    "tnau_thresholds": DATA_DIR / "TNAU_Crop_Pest_Threshold_and_Control.csv",
    "ipm_thresholds": DATA_DIR / "Pest_Economic_Thresholds_and_IPM.csv",
    "crop_phenology": DATA_DIR / "Crop_Pest_Phenology_Advisory.csv",
    
    # Historical / Regional context
    "regional_infestations": DATA_DIR / "Historical_Regional_Pest_Infestation.csv",
    "crop_yield_history": DATA_DIR / "Custom_Crops_yield_Historical_Dataset.csv",
}

# Standard column mapping to harmonize different datasets into one common schema
COLUMN_MAPPINGS = {
    # Variations in weather and identifier columns
    "Observation Year": "year",
    "Standard Week": "standard_week",
    "MaxT": "temp_max",
    "MaxT(°C)": "temp_max",
    "MinT": "temp_min",
    "MinT(°C)": "temp_min",
    "RH1(%)": "rh_morning",
    "RH1": "rh_morning",
    "RH2(%)": "rh_evening",
    "RH2": "rh_evening",
    "RF(mm)": "rainfall",
    "RF": "rainfall",
    "WS(kmph)": "wind_speed",
    "WS": "wind_speed",
    "SSH(hrs)": "sunshine_hours",
    "SSH": "sunshine_hours",
    "EVP(mm)": "evaporation",
    "EVP": "evaporation",
    "PEST NAME": "pest_name",
    "Pest": "pest_name",
    "Pest Value": "pest_count",
    "Location": "location",
    "Collection Type": "collection_type"
}

# Base physiological threshold temperatures (T_base in deg Celsius)
# Used to calculate growing degree-days (GDD) for insect development rates
BASE_TEMPERATURES = {
    "Brownplanthopper": 12.0,
    "Yellowstemborer": 10.0,
    "LeafFolder": 11.5,
    "Whitebackedplanthopper": 12.0,
    "Greenleafhoper": 11.0,
    "Gallmidge": 12.0,
    "Bollworm": 12.5,
    "PinkBollworm": 12.5,
    "Whitefly": 10.0,
    "Spodoptera": 10.9,     # Fall Armyworm
    "default": 10.0
}

# Economic Threshold Levels (ETL) for ground truth labeling
# If pest count >= ETL, outbreak_flag is labeled as 1
ECONOMIC_THRESHOLD_LEVELS = {
    "Brownplanthopper": 5.0,        # 5-10 hoppers per hill during tillering
    "Yellowstemborer": 2.0,         # 2 egg masses / m2 or 10% dead hearts
    "LeafFolder": 2.0,              # 2 damaged leaves per hill
    "Gallmidge": 1.0,               # 1 silver shoot per m2
    "Whitebackedplanthopper": 5.0,  # 5-10 insects per hill
    "Greenleafhoper": 10.0,         # 10-20 hoppers per hill
    "Bollworm": 1.0,                # 1 larva per plant or 10% damaged bolls
    "PinkBollworm": 8.0,            # 8 moths/trap/night for 3 consecutive nights
    "Whitefly": 5.0,                # 5-10 nymphs per leaf
    "default": 5.0
}

# Early-warning risk tiers
RISK_LEVELS = {
    "LOW": {"min": 0.0, "max": 0.30, "color": "green", "action": "Routine scouting"},
    "MODERATE": {"min": 0.30, "max": 0.60, "color": "yellow", "action": "Increase scouting frequency"},
    "HIGH": {"min": 0.60, "max": 0.80, "color": "orange", "action": "Prepare bio-control / neem barriers"},
    "CRITICAL": {"min": 0.80, "max": 1.00, "color": "red", "action": "Initiate immediate targeted IPM intervention"}
}
