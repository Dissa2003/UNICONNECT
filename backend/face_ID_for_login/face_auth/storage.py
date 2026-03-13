import csv
import os
import pickle
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np

from .config import ATTENDANCE_DIR, AUTH_DB_PATH, FACES_PKL_PATH, NAMES_PKL_PATH


def ensure_dirs() -> None:
    ATTENDANCE_DIR.mkdir(parents=True, exist_ok=True)


def load_legacy_dataset() -> Tuple[List[str], np.ndarray]:
    if not NAMES_PKL_PATH.exists() or not FACES_PKL_PATH.exists():
        raise FileNotFoundError("Legacy dataset not found. Run add_faces.py first.")

    with NAMES_PKL_PATH.open("rb") as names_file:
        names = pickle.load(names_file)

    with FACES_PKL_PATH.open("rb") as faces_file:
        faces = pickle.load(faces_file)

    return names, np.asarray(faces)


def append_legacy_dataset(name: str, face_samples: np.ndarray) -> None:
    ensure_dirs()
    face_samples = np.asarray(face_samples)

    if not NAMES_PKL_PATH.exists():
        names = [name] * len(face_samples)
    else:
        with NAMES_PKL_PATH.open("rb") as names_file:
            names = pickle.load(names_file)
        names = names + ([name] * len(face_samples))

    with NAMES_PKL_PATH.open("wb") as names_file:
        pickle.dump(names, names_file)

    if not FACES_PKL_PATH.exists():
        updated_faces = face_samples
    else:
        with FACES_PKL_PATH.open("rb") as faces_file:
            existing_faces = np.asarray(pickle.load(faces_file))
        updated_faces = np.append(existing_faces, face_samples, axis=0)

    with FACES_PKL_PATH.open("wb") as faces_file:
        pickle.dump(updated_faces, faces_file)


def attendance_file_for_today() -> Path:
    date_for_file = datetime.now().strftime("%Y-%m-%d")
    return ATTENDANCE_DIR / f"Attendance_{date_for_file}.csv"


def append_attendance(name: str, date_for_file: str, time_str: str) -> None:
    ensure_dirs()
    file_path = ATTENDANCE_DIR / f"Attendance_{date_for_file}.csv"
    file_exists = file_path.exists()

    with file_path.open("a", newline="") as csv_file:
        writer = csv.writer(csv_file)
        if not file_exists:
            writer.writerow(["Name", "Date", "Time"])
        writer.writerow([name, date_for_file, time_str])


def init_auth_db(db_path: Path = AUTH_DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                metadata_json TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS face_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sample_index INTEGER NOT NULL,
                sample_blob BLOB NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(user_id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                predicted_name TEXT,
                success INTEGER NOT NULL,
                confidence REAL,
                reason TEXT,
                liveness_status TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()
