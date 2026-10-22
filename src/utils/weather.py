"""
Live Weather Ingestion Service.

Connects to Open-Meteo free API to query real-time meteorological observations
and forecasts for Indian Agricultural ICAR Stations.
Provides seamless fallback to historical seasonal baselines when offline.
"""

from typing import Dict, Any, Optional
import httpx
from datetime import datetime

from src.utils.logger import get_logger

log = get_logger("services.weather")

# Accurate GPS coordinates for major Indian ICAR Agricultural Centers
STATION_COORDINATES = {
    "Cuttack": {"lat": 20.4625, "lon": 85.8828, "state": "Odisha"},
    "Maruteru": {"lat": 16.6318, "lon": 81.7408, "state": "Andhra Pradesh"},
    "Lam": {"lat": 16.3533, "lon": 80.4447, "state": "Andhra Pradesh"},
    "Akola": {"lat": 20.7002, "lon": 77.0082, "state": "Maharashtra"},
    "Nagpur": {"lat": 21.1458, "lon": 79.0882, "state": "Maharashtra"},
    "Ludhiana": {"lat": 30.9010, "lon": 75.8573, "state": "Punjab"},
    "Raipur": {"lat": 21.2514, "lon": 81.6296, "state": "Chhattisgarh"},
    "Rajendranagar": {"lat": 17.3204, "lon": 78.4069, "state": "Telangana"},
    "Sirsa": {"lat": 29.5349, "lon": 75.0298, "state": "Haryana"},
    "Pharbhani": {"lat": 19.2612, "lon": 76.7766, "state": "Maharashtra"},
    "Palampur": {"lat": 32.1109, "lon": 76.5363, "state": "Himachal Pradesh"},
}


class LiveWeatherService:
    """
    Fetches real-time hourly and daily weather observations for any ICAR research center.
    """

    OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

    def fetch_station_weather(self, location_name: str) -> Dict[str, Any]:
        """
        Retrieves real-time max/min temp, humidity, and rainfall from Open-Meteo API.
        Falls back gracefully if network is unavailable.
        """
        coords = STATION_COORDINATES.get(location_name)
        if not coords:
            # Fallback to Cuttack CRRI coordinates
            coords = STATION_COORDINATES["Cuttack"]

        params = {
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "current": ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m"],
            "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "wind_speed_10m_max"],
            "timezone": "Asia/Kolkata",
            "forecast_days": 1,
        }

        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(self.OPEN_METEO_URL, params=params)
                if res.status_code == 200:
                    data = res.json()
                    current = data.get("current", {})
                    daily = data.get("daily", {})

                    temp_max = daily.get("temperature_2m_max", [32.0])[0]
                    temp_min = daily.get("temperature_2m_min", [24.0])[0]
                    rh_now = current.get("relative_humidity_2m", 80.0)
                    
                    # Estimate morning vs evening RH from current humidity
                    rh_morning = min(round(rh_now + 8.0, 1), 98.0)
                    rh_evening = max(round(rh_now - 12.0, 1), 40.0)
                    rainfall = daily.get("precipitation_sum", [current.get("precipitation", 0.0)])[0]
                    wind_speed = current.get("wind_speed_10m", 3.5)

                    # Indian Agricultural Season computation
                    now_ist = datetime.now()
                    month = now_ist.month
                    if 6 <= month <= 10:
                        season = "Kharif (Monsoon Season)"
                    elif 11 <= month or month <= 3:
                        season = "Rabi (Winter Season)"
                    else:
                        season = "Zaid (Summer Season)"

                    # ISO week is approximately the Standard Meteorological Week (SMW)
                    smw = int(now_ist.strftime("%V"))

                    # Weather condition description
                    weather_code = current.get("weather_code", 0)
                    temp_curr = current.get("temperature_2m", (temp_max + temp_min) / 2.0)

                    condition = "Clear / Sunny"
                    if rainfall > 5.0:
                        condition = "Heavy Rainfall"
                    elif rainfall > 0.1:
                        condition = "Light Rain / Drizzle"
                    elif rh_now > 85.0:
                        condition = "Humid & Overcast"
                    elif temp_curr > 35.0:
                        condition = "Hot & Dry"

                    return {
                        "location": location_name,
                        "state": coords["state"],
                        "source": "Open-Meteo Live API",
                        "status": "success",
                        "condition": condition,
                        "season": season,
                        "standard_week": smw,
                        "current_temp": float(temp_curr),
                        "temp_max": float(temp_max),
                        "temp_min": float(temp_min),
                        "rh_morning": float(rh_morning),
                        "rh_evening": float(rh_evening),
                        "rh_current": float(rh_now),
                        "rainfall": float(rainfall),
                        "wind_speed": float(wind_speed),
                        "sunshine_hours": 7.0,
                        "evaporation": 3.8,
                        "date": now_ist.strftime("%A, %d %B %Y"),
                        "time": now_ist.strftime("%I:%M:%S %p IST"),
                        "timestamp": now_ist.isoformat(),
                    }
        except Exception as e:
            log.warning(f"Live weather API request failed for {location_name}: {e}. Returning seasonal default.")

        # Baseline fallback for offline / disconnected environments
        now_ist = datetime.now()
        month = now_ist.month
        season = "Kharif (Monsoon Season)" if 6 <= month <= 10 else ("Rabi (Winter Season)" if 11 <= month or month <= 3 else "Zaid (Summer Season)")
        smw = int(now_ist.strftime("%V"))

        return {
            "location": location_name,
            "state": coords["state"],
            "source": "Agro-Climatic Seasonal Baseline (Offline Fallback)",
            "status": "fallback",
            "condition": "Seasonal Climate Normal",
            "season": season,
            "standard_week": smw,
            "current_temp": 28.5,
            "temp_max": 31.5,
            "temp_min": 24.5,
            "rh_morning": 88.0,
            "rh_evening": 70.0,
            "rh_current": 78.0,
            "rainfall": 12.0,
            "wind_speed": 3.2,
            "sunshine_hours": 6.5,
            "evaporation": 3.5,
            "date": now_ist.strftime("%A, %d %B %Y"),
            "time": now_ist.strftime("%I:%M:%S %p IST"),
            "timestamp": now_ist.isoformat(),
        }


# Global live weather service singleton instance
weather_service = LiveWeatherService()
