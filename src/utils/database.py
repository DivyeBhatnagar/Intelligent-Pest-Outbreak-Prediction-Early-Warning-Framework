"""
Historical Telemetry, In-Field Scouting, and Prediction Audit Database.

Uses SQLite with persistent disk storage in artifacts/pest_framework.db.
Provides CRUD and query methods for field observations and automated risk audits.
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
    Manages SQLite schema initialization, scouting entries, and prediction audit records.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.init_database()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def init_database(self):
        """Creates the scouting telemetry and prediction audit tables."""
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

            conn.commit()
            log.info(f"Initialized database schema at {self.db_path.name}")

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


# Global database service singleton instance
db_service = DatabaseService()
