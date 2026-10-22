from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date


class WeatherObservation(BaseModel):
    """Micro-climate observations provided for pest outbreak risk estimation."""
    temp_max: float = Field(..., ge=-10.0, le=60.0, description="Max ambient temperature (°C)")
    temp_min: float = Field(..., ge=-15.0, le=50.0, description="Min ambient temperature (°C)")
    rh_morning: float = Field(..., ge=0.0, le=100.0, description="Morning relative humidity (%)")
    rh_evening: float = Field(..., ge=0.0, le=100.0, description="Evening relative humidity (%)")
    rainfall: float = Field(default=0.0, ge=0.0, description="Rainfall in standard week / day (mm)")
    wind_speed: Optional[float] = Field(default=3.0, ge=0.0, description="Wind speed (km/h)")
    sunshine_hours: Optional[float] = Field(default=7.0, ge=0.0, le=16.0, description="Bright sunshine hours")
    evaporation: Optional[float] = Field(default=3.0, ge=0.0, description="Evaporation rate (mm)")


class PredictionRequest(BaseModel):
    """Payload to request pest outbreak risk assessment."""
    crop: str = Field(default="Rice", description="Target crop (e.g., Rice, Cotton, Maize)")
    pest_name: str = Field(default="Brownplanthopper", description="Pest species to evaluate")
    location: str = Field(default="Cuttack", description="Agro-climatic zone or district")
    standard_week: int = Field(default=28, ge=1, le=53, description="Standard Meteorological Week (1-53)")
    current_pest_count: Optional[float] = Field(default=0.0, ge=0.0, description="Current field scout count per hill or trap")
    weather: WeatherObservation


class ContributingFactor(BaseModel):
    feature: str
    impact: str
    description: str


class PredictionResponse(BaseModel):
    """Output early warning prediction and actionable advisory."""
    crop: str
    pest_name: str
    location: str
    standard_week: int
    risk_score: float = Field(..., description="Estimated outbreak probability [0.0 - 1.0]")
    risk_level: str = Field(..., description="LOW | MODERATE | HIGH | CRITICAL")
    is_warning: bool = Field(..., description="True if alert triggers (risk >= 0.60)")
    gdd_accumulated: float
    rh_differential: float
    top_factors: List[ContributingFactor]
    advisory: str
    model_version: str = "v1.0-baseline"


class HealthCheckResponse(BaseModel):
    status: str
    version: str
    datasets_ready: bool
    total_surveillance_records: int
    active_alerts: int = 0
    model_loaded: bool = False
    weather_service: str = "Open-Meteo"


class AlertDispatchRequest(BaseModel):
    """Payload to trigger email/SMS advisory dispatch."""
    prediction_data: Dict[str, Any]
    recipient_email: Optional[str] = Field(default=None, description="Recipient email address")
    recipient_phone: Optional[str] = Field(default=None, description="Recipient phone number (e.g., +919876543210)")


class ScoutingReportRequest(BaseModel):
    """Payload to record an in-field scouting entry."""
    crop: str = Field(default="Rice")
    location: str = Field(default="Cuttack")
    pest_name: str = Field(default="Brown Planthopper")
    standard_week: int = Field(default=32, ge=1, le=53)
    current_pest_count: float = Field(default=0.0, ge=0.0)
    temp_max: float = Field(default=32.0)
    temp_min: float = Field(default=24.0)
    rh_morning: float = Field(default=85.0)
    rh_evening: float = Field(default=65.0)
    rainfall: float = Field(default=0.0)
    scout_officer: Optional[str] = Field(default="Autonomous Field Agent")


# ------------------------------------------------------------------
# Field Observation Schemas
# ------------------------------------------------------------------

class ObservationCreate(BaseModel):
    """Schema for creating a new field observation."""
    observation_date: str = Field(default_factory=lambda: date.today().isoformat(), description="Date of observation (YYYY-MM-DD)")
    crop: str = Field(..., description="Crop under surveillance (Rice / Cotton)")
    pest_name: str = Field(..., description="Target pest species name")
    location: str = Field(..., description="ICAR monitoring station name")
    standard_week: int = Field(..., ge=1, le=53, description="Standard Meteorological Week")
    pest_count: float = Field(..., ge=0.0, description="Observed pest count")
    count_unit: str = Field(default="per hill", description="Unit of pest count (per hill, per trap, per leaf)")
    life_stage: str = Field(default="Mixed", description="Life stage observed (Egg, Nymph, Adult, Mixed)")
    collection_method: str = Field(default="Visual count", description="Scouting method used")
    temp_max: Optional[float] = Field(default=None, description="Max temperature (°C)")
    temp_min: Optional[float] = Field(default=None, description="Min temperature (°C)")
    rh_morning: Optional[float] = Field(default=None, description="Morning RH (%)")
    rh_evening: Optional[float] = Field(default=None, description="Evening RH (%)")
    rainfall: Optional[float] = Field(default=0.0, description="Rainfall (mm)")
    weather_source: str = Field(default="Manual entry", description="Source of weather data")
    observer_id: str = Field(default="Field Agent", description="Observer or scout identifier")
    notes: Optional[str] = Field(default="", description="Additional field notes")
    verification_status: str = Field(default="pending", description="pending | verified | rejected")


class ObservationUpdate(BaseModel):
    """Partial update schema for a field observation."""
    verification_status: Optional[str] = None
    notes: Optional[str] = None
    pest_count: Optional[float] = None
    life_stage: Optional[str] = None
    collection_method: Optional[str] = None
    observer_id: Optional[str] = None


# ------------------------------------------------------------------
# Alert Schemas
# ------------------------------------------------------------------

class AlertCreate(BaseModel):
    """Schema to manually create an alert from a verified prediction."""
    severity: str = Field(..., description="CRITICAL | HIGH | MODERATE | LOW")
    location: str
    pest_name: str
    crop: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    predicted_horizon: str = Field(default="Next 7 days")
    explanation_summary: Optional[str] = Field(default="")
    source_prediction_id: Optional[int] = None
    source_observation_id: Optional[int] = None


class AlertStatusUpdate(BaseModel):
    """Schema to update alert status."""
    status: str = Field(..., description="active | acknowledged | resolved")
