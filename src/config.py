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
    "Pest/Disease": "pest_disease_raw",
    "Pest Value": "pest_count",
    "Location": "location",
    "Collection Type": "collection_type"
}

# Base physiological threshold temperatures (T_base in deg Celsius)
# Used to calculate growing degree-days (GDD) for insect development rates
BASE_TEMPERATURES = {
    # Rice pests
    "Brown Planthopper": 12.0,
    "Brownplanthopper": 12.0,
    "Yellow Stem Borer": 10.0,
    "Yellowstemborer": 10.0,
    "Leaf Folder": 11.5,
    "LeafFolder": 11.5,
    "White Backed Planthopper": 12.0,
    "Whitebackedplanthopper": 12.0,
    "Green Leafhopper": 11.0,
    "Greenleafhopper": 11.0,
    "Greenleafhoper": 11.0,
    "Gall Midge": 12.0,
    "Gallmidge": 12.0,
    "Caseworm": 10.0,
    "Zigzag Leafhopper": 11.0,
    "ZigZagleafhopper": 11.0,
    "Leaf Blast": 15.0,
    "LeafBlast": 15.0,
    "Neck Blast": 15.0,
    "NeckBlast": 15.0,
    # Cotton pests
    "American Bollworm": 12.5,
    "AmericanBollworm": 12.5,
    "Pink Bollworm": 12.5,
    "PinkBollworm": 12.5,
    "Spotted Bollworm": 12.5,
    "SpottedBollworm": 12.5,
    "Bollworm": 12.5,
    "Whitefly": 10.0,
    "Jassid": 10.0,
    "Aphid": 8.0,
    "Aphids": 8.0,
    "Thrips": 10.5,
    "Spodoptera": 10.9,     # Fall Armyworm / Tobacco caterpillar
    "Mealybug": 11.0,
    "Mirid Bug": 12.0,
    "Miridbug": 12.0,
    "Bacterial Leaf Blight": 15.0,
    "Alternaria Leaf Blight": 14.0,
    "Alternaria Leaf Spot": 14.0,
    "default": 10.0
}

# Economic Threshold Levels (ETL) for ground truth labeling
# If pest count >= ETL, outbreak_flag is labeled as 1
ECONOMIC_THRESHOLD_LEVELS = {
    # Rice pests
    "Brown Planthopper": 5.0,        # 5-10 hoppers per hill during tillering
    "Brownplanthopper": 5.0,
    "Yellow Stem Borer": 2.0,         # 2 egg masses / m2 or 10% dead hearts
    "Yellowstemborer": 2.0,
    "Leaf Folder": 2.0,              # 2 damaged leaves per hill
    "LeafFolder": 2.0,
    "Gall Midge": 1.0,               # 1 silver shoot per m2
    "Gallmidge": 1.0,
    "White Backed Planthopper": 5.0,  # 5-10 insects per hill
    "Whitebackedplanthopper": 5.0,
    "Green Leafhopper": 10.0,         # 10-20 hoppers per hill
    "Greenleafhopper": 10.0,
    "Greenleafhoper": 10.0,
    "Caseworm": 2.0,                 # 2 damaged cases per hill
    "Zigzag Leafhopper": 10.0,
    "ZigZagleafhopper": 10.0,
    "Leaf Blast": 5.0,               # 5% leaf area infected
    "LeafBlast": 5.0,
    "Neck Blast": 2.0,               # 2% panicle infection
    "NeckBlast": 2.0,
    # Cotton pests
    "American Bollworm": 1.0,        # 1 larva/plant or 8-10 moths/trap
    "AmericanBollworm": 1.0,
    "Pink Bollworm": 8.0,            # 8 moths/trap/night for 3 consecutive nights
    "PinkBollworm": 8.0,
    "Spotted Bollworm": 1.0,         # 1 larva/plant or 10% damaged squares
    "SpottedBollworm": 1.0,
    "Bollworm": 1.0,
    "Whitefly": 5.0,                # 5-10 nymphs per leaf
    "Jassid": 2.0,                  # 2 nymphs per leaf
    "Aphid": 10.0,                  # 10% affected plants or 10-15 aphids/leaf
    "Aphids": 10.0,
    "Thrips": 5.0,                  # 5-10 thrips per leaf
    "Spodoptera": 10.0,             # 10 larvae/100 plants or 10 egg masses
    "Mealybug": 5.0,                # 5% plant incidence
    "Mirid Bug": 5.0,
    "Miridbug": 5.0,
    "Bacterial Leaf Blight": 5.0,    # 5% disease incidence
    "Alternaria Leaf Blight": 5.0,
    "Alternaria Leaf Spot": 5.0,
    "default": 5.0
}

# Early-warning risk tiers
RISK_LEVELS = {
    "LOW": {"min": 0.0, "max": 0.30, "color": "green", "action": "Routine scouting"},
    "MODERATE": {"min": 0.30, "max": 0.60, "color": "yellow", "action": "Increase scouting frequency"},
    "HIGH": {"min": 0.60, "max": 0.80, "color": "orange", "action": "Prepare bio-control / neem barriers"},
    "CRITICAL": {"min": 0.80, "max": 1.00, "color": "red", "action": "Initiate immediate targeted IPM intervention"}
}

# Processed train/test dataset file paths
TRAIN_DATA_FILE = PROCESSED_DATA_DIR / "train.csv"
TEST_DATA_FILE = PROCESSED_DATA_DIR / "test.csv"
X_TRAIN_FILE = PROCESSED_DATA_DIR / "X_train.parquet"
X_TEST_FILE = PROCESSED_DATA_DIR / "X_test.parquet"
Y_TRAIN_FILE = PROCESSED_DATA_DIR / "y_train.csv"
Y_TEST_FILE = PROCESSED_DATA_DIR / "y_test.csv"
PREPROCESSOR_FILE = MODELS_DIR / "preprocessor.joblib"
FEATURE_METADATA_FILE = MODELS_DIR / "feature_metadata.json"
