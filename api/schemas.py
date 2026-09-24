from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


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
