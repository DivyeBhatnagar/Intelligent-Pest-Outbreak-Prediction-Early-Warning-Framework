"""
Historical Telemetry, In-Field Scouting, Prediction Audit, Observations, and Alerts Database.

Uses SQLite with persistent disk storage in artifacts/pest_framework.db.
Provides full CRUD and query methods for field observations, automated risk audits, and alerts.
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import sqlite3
import json
from datetime import datetime

from src.config import ARTIFACTS_DIR
from src.utils.logger import get_logger

log = get_logger("services.db")

DB_PATH = ARTIFACTS_DIR / "pest_framework.db"


class DatabaseService:
    """
    Manages SQLite schema initialization, scouting entries, prediction audit records,
    field observations, and alert lifecycle management.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.init_database()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def init_database(self):
        """Creates all required tables if they do not already exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Field Scouting Logs Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS field_scouting_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                crop TEXT NOT NULL,
                location TEXT NOT NULL,
                pest_name TEXT NOT NULL,
                standard_week INTEGER NOT NULL,
                current_pest_count REAL NOT NULL,
                temp_max REAL NOT NULL,
                temp_min REAL NOT NULL,
                rh_morning REAL NOT NULL,
                rh_evening REAL NOT NULL,
                rainfall REAL NOT NULL,
                scout_officer TEXT
            )
            """)

            # 2. Model Prediction Audit Trail Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS prediction_audit_trail (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                crop TEXT NOT NULL,
                location TEXT NOT NULL,
                pest_name TEXT NOT NULL,
                risk_score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                is_warning INTEGER NOT NULL,
                gdd_accumulated REAL,
                vpd_kpa REAL,
                top_factors_json TEXT,
                advisory TEXT,
                model_version TEXT NOT NULL
            )
            """)

            # 3. Notification Dispatch History Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                prediction_id INTEGER,
                recipient_email TEXT,
                recipient_phone TEXT,
                channel TEXT,
                status TEXT,
                message_body TEXT,
                FOREIGN KEY (prediction_id) REFERENCES prediction_audit_trail(id)
            )
            """)

            # 4. Field Observations Table (rich structured form entries)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS field_observations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                observation_date TEXT NOT NULL,
                crop TEXT NOT NULL,
                pest_name TEXT NOT NULL,
                location TEXT NOT NULL,
                standard_week INTEGER NOT NULL,
                pest_count REAL NOT NULL,
                count_unit TEXT DEFAULT 'per hill',
                life_stage TEXT DEFAULT 'Mixed',
                collection_method TEXT DEFAULT 'Visual count',
                temp_max REAL,
                temp_min REAL,
                rh_morning REAL,
                rh_evening REAL,
                rainfall REAL DEFAULT 0.0,
                weather_source TEXT DEFAULT 'Manual entry',
                observer_id TEXT DEFAULT 'Field Agent',
                notes TEXT,
                verification_status TEXT DEFAULT 'pending',
                prediction_id INTEGER,
                FOREIGN KEY (prediction_id) REFERENCES prediction_audit_trail(id)
            )
            """)

            # 5. Alerts Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                severity TEXT NOT NULL,
                location TEXT NOT NULL,
                pest_name TEXT NOT NULL,
                crop TEXT NOT NULL,
                risk_score REAL NOT NULL,
                predicted_horizon TEXT DEFAULT 'Next 7 days',
                explanation_summary TEXT,
                status TEXT DEFAULT 'active',
                acknowledged_at TIMESTAMP,
                resolved_at TIMESTAMP,
                source_prediction_id INTEGER,
                source_observation_id INTEGER,
                dedup_key TEXT,
                FOREIGN KEY (source_prediction_id) REFERENCES prediction_audit_trail(id),
                FOREIGN KEY (source_observation_id) REFERENCES field_observations(id)
            )
            """)

            conn.commit()
            log.info(f"Database schema initialized at {self.db_path.name}")

    # ------------------------------------------------------------------
    # Scouting Logs
    # ------------------------------------------------------------------

    def log_scouting_entry(self, data: Dict[str, Any]) -> int:
        """Stores a new field scouting report."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO field_scouting_logs (
                crop, location, pest_name, standard_week, current_pest_count,
                temp_max, temp_min, rh_morning, rh_evening, rainfall, scout_officer
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data["crop"],
                data["location"],
                data["pest_name"],
                int(data.get("standard_week", 1)),
                float(data.get("current_pest_count", 0.0)),
                float(data.get("temp_max", 30.0)),
                float(data.get("temp_min", 20.0)),
                float(data.get("rh_morning", 80.0)),
                float(data.get("rh_evening", 60.0)),
                float(data.get("rainfall", 0.0)),
                data.get("scout_officer", "Autonomous Scout Agent"),
            ))
            conn.commit()
            return cursor.lastrowid

    # ------------------------------------------------------------------
    # Prediction Audit Trail
    # ------------------------------------------------------------------

    def log_prediction_audit(self, data: Dict[str, Any]) -> int:
        """Logs an evaluated prediction result and SHAP explanation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            factors_json = json.dumps(data.get("top_factors", []))
            cursor.execute("""
            INSERT INTO prediction_audit_trail (
                crop, location, pest_name, risk_score, risk_level, is_warning,
                gdd_accumulated, vpd_kpa, top_factors_json, advisory, model_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data["crop"],
                data["location"],
                data["pest_name"],
                float(data["risk_score"]),
                data["risk_level"],
                int(data.get("is_warning", False)),
                float(data.get("gdd_accumulated", 0.0)),
                float(data.get("vpd_kpa", 0.0)),
                factors_json,
                data.get("advisory", ""),
                data.get("model_version", "v2.0-ml-ensemble"),
            ))
            conn.commit()
            return cursor.lastrowid

    def get_recent_predictions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches recent prediction records with parsed factor JSON."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM prediction_audit_trail ORDER BY id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                if item.get("top_factors_json"):
                    try:
                        item["top_factors"] = json.loads(item["top_factors_json"])
                    except Exception:
                        item["top_factors"] = []
                results.append(item)
            return results

    def get_recent_scouting(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches recent field telemetry submissions."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM field_scouting_logs ORDER BY id DESC LIMIT ?",
                (limit,)
            )
            return [dict(r) for r in cursor.fetchall()]

    # ------------------------------------------------------------------
    # Field Observations
    # ------------------------------------------------------------------

    def create_observation(self, data: Dict[str, Any]) -> int:
        """Creates a new structured field observation record."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            obs_date = data.get("observation_date", datetime.now().strftime("%Y-%m-%d"))
            cursor.execute("""
            INSERT INTO field_observations (
                observation_date, crop, pest_name, location, standard_week,
                pest_count, count_unit, life_stage, collection_method,
                temp_max, temp_min, rh_morning, rh_evening, rainfall,
                weather_source, observer_id, notes, verification_status, prediction_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                obs_date,
                data.get("crop", "Rice"),
                data.get("pest_name", "Brown Planthopper"),
                data.get("location", "Cuttack"),
                int(data.get("standard_week", 1)),
                float(data.get("pest_count", 0.0)),
                data.get("count_unit", "per hill"),
                data.get("life_stage", "Mixed"),
                data.get("collection_method", "Visual count"),
                float(data.get("temp_max", 30.0)) if data.get("temp_max") else None,
                float(data.get("temp_min", 20.0)) if data.get("temp_min") else None,
                float(data.get("rh_morning", 80.0)) if data.get("rh_morning") else None,
                float(data.get("rh_evening", 60.0)) if data.get("rh_evening") else None,
                float(data.get("rainfall", 0.0)),
                data.get("weather_source", "Manual entry"),
                data.get("observer_id", "Field Agent"),
                data.get("notes", ""),
                data.get("verification_status", "pending"),
                data.get("prediction_id"),
            ))
            conn.commit()
            return cursor.lastrowid

    def get_observations(
        self,
        limit: int = 50,
        offset: int = 0,
        crop: Optional[str] = None,
        pest_name: Optional[str] = None,
        location: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetches field observations with filtering, sorting and pagination."""
        conditions = []
        params = []

        if crop:
            conditions.append("crop = ?")
            params.append(crop)
        if pest_name:
            conditions.append("pest_name LIKE ?")
            params.append(f"%{pest_name}%")
        if location:
            conditions.append("location = ?")
            params.append(location)
        if start_date:
            conditions.append("observation_date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("observation_date <= ?")
            params.append(end_date)

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        with self.get_connection() as conn:
            cursor = conn.cursor()
            count_q = f"SELECT COUNT(*) FROM field_observations {where_clause}"
            cursor.execute(count_q, params)
            total = cursor.fetchone()[0]

            cursor.execute(
                f"SELECT * FROM field_observations {where_clause} ORDER BY id DESC LIMIT ? OFFSET ?",
                params + [limit, offset]
            )
            rows = [dict(r) for r in cursor.fetchall()]

        return {"total": total, "items": rows, "limit": limit, "offset": offset}

    def get_observation_by_id(self, obs_id: int) -> Optional[Dict[str, Any]]:
        """Fetches a single observation by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM field_observations WHERE id = ?", (obs_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_observation(self, obs_id: int, updates: Dict[str, Any]) -> bool:
        """Updates specified fields of an observation."""
        allowed = {
            "verification_status", "notes", "pest_count", "life_stage",
            "collection_method", "observer_id"
        }
        fields = {k: v for k, v in updates.items() if k in allowed}
        if not fields:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE field_observations SET {set_clause} WHERE id = ?",
                list(fields.values()) + [obs_id]
            )
            conn.commit()
            return cursor.rowcount > 0

    # ------------------------------------------------------------------
    # Alerts
    # ------------------------------------------------------------------

    def create_alert(self, data: Dict[str, Any]) -> Optional[int]:
        """Creates an alert with deduplication — one active alert per location/pest combo."""
        dedup_key = f"{data.get('location','')}__{data.get('pest_name','')}__{data.get('severity','')}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Check for existing active alert with same dedup key
            cursor.execute(
                "SELECT id FROM alerts WHERE dedup_key = ? AND status = 'active'",
                (dedup_key,)
            )
            existing = cursor.fetchone()
            if existing:
                return None  # Deduplicated

            cursor.execute("""
            INSERT INTO alerts (
                severity, location, pest_name, crop, risk_score,
                predicted_horizon, explanation_summary, status,
                source_prediction_id, source_observation_id, dedup_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
            """, (
                data.get("severity", "MODERATE"),
                data.get("location", "Unknown"),
                data.get("pest_name", "Unknown"),
                data.get("crop", "Unknown"),
                float(data.get("risk_score", 0.5)),
                data.get("predicted_horizon", "Next 7 days"),
                data.get("explanation_summary", ""),
                data.get("source_prediction_id"),
                data.get("source_observation_id"),
                dedup_key,
            ))
            conn.commit()
            return cursor.lastrowid

    def get_alerts(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        location: Optional[str] = None,
        pest_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetches alerts with optional filters and pagination."""
        conditions = []
        params = []

        if status:
            conditions.append("status = ?")
            params.append(status)
        if severity:
            conditions.append("severity = ?")
            params.append(severity)
        if location:
            conditions.append("location = ?")
            params.append(location)
        if pest_name:
            conditions.append("pest_name LIKE ?")
            params.append(f"%{pest_name}%")

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM alerts {where_clause}", params)
            total = cursor.fetchone()[0]
            cursor.execute(
                f"SELECT * FROM alerts {where_clause} ORDER BY id DESC LIMIT ? OFFSET ?",
                params + [limit, offset]
            )
            rows = [dict(r) for r in cursor.fetchall()]

        return {"total": total, "items": rows, "limit": limit, "offset": offset}

    def update_alert_status(self, alert_id: int, new_status: str) -> bool:
        """Acknowledges or resolves an alert."""
        allowed_statuses = {"active", "acknowledged", "resolved"}
        if new_status not in allowed_statuses:
            return False
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if new_status == "acknowledged":
                cursor.execute(
                    "UPDATE alerts SET status = ?, acknowledged_at = ? WHERE id = ?",
                    (new_status, now, alert_id)
                )
            elif new_status == "resolved":
                cursor.execute(
                    "UPDATE alerts SET status = ?, resolved_at = ? WHERE id = ?",
                    (new_status, now, alert_id)
                )
            else:
                cursor.execute(
                    "UPDATE alerts SET status = ? WHERE id = ?",
                    (new_status, alert_id)
                )
            conn.commit()
            return cursor.rowcount > 0

    def get_risk_history(
        self,
        limit: int = 100,
        crop: Optional[str] = None,
        pest_name: Optional[str] = None,
        location: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Returns prediction audit records filtered for charting risk history."""
        conditions = []
        params: List[Any] = []

        if crop:
            conditions.append("crop = ?")
            params.append(crop)
        if pest_name:
            conditions.append("pest_name LIKE ?")
            params.append(f"%{pest_name}%")
        if location:
            conditions.append("location = ?")
            params.append(location)

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        params.append(limit)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"""SELECT id, created_at, crop, location, pest_name,
                    risk_score, risk_level, gdd_accumulated, vpd_kpa, is_warning
                    FROM prediction_audit_trail {where_clause}
                    ORDER BY id DESC LIMIT ?""",
                params
            )
            return [dict(r) for r in cursor.fetchall()]

    def get_station_summary(self) -> List[Dict[str, Any]]:
        """Returns latest risk score per station from prediction audit trail."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT location,
                       MAX(id) as latest_id,
                       risk_score,
                       risk_level,
                       pest_name,
                       crop,
                       created_at
                FROM prediction_audit_trail
                GROUP BY location
                ORDER BY risk_score DESC
            """)
            return [dict(r) for r in cursor.fetchall()]

    def get_active_alert_count(self) -> int:
        """Returns count of currently active alerts."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM alerts WHERE status = 'active'")
            return cursor.fetchone()[0]


# Global database service singleton instance
db_service = DatabaseService()
