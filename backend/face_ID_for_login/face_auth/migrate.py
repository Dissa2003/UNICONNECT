import json
import pickle
import sqlite3
from datetime import datetime

import numpy as np

from .config import AUTH_DB_PATH, FACES_PKL_PATH, NAMES_PKL_PATH
from .storage import init_auth_db


def migrate_legacy_pickles_to_sqlite() -> int:
    """Migrate names.pkl/faces_data.pkl into SQLite users + face_samples tables."""
    if not NAMES_PKL_PATH.exists() or not FACES_PKL_PATH.exists():
        return 0

    init_auth_db(AUTH_DB_PATH)

    with NAMES_PKL_PATH.open("rb") as names_file:
        names = pickle.load(names_file)

    with FACES_PKL_PATH.open("rb") as faces_file:
        faces = np.asarray(pickle.load(faces_file))

    if len(names) != len(faces):
        raise ValueError("Legacy data mismatch: names and faces length differ")

    conn = sqlite3.connect(str(AUTH_DB_PATH))
    migrated = 0

    try:
        cur = conn.cursor()
        now = datetime.utcnow().isoformat()

        sample_counts = {}
        for idx, name in enumerate(names):
            user_id = str(name)

            cur.execute(
                """
                INSERT OR IGNORE INTO users (user_id, display_name, metadata_json, is_active, created_at)
                VALUES (?, ?, ?, 1, ?)
                """,
                (user_id, str(name), json.dumps({"source": "legacy_pickle"}), now),
            )

            sample_index = sample_counts.get(user_id, 0)
            sample_counts[user_id] = sample_index + 1

            cur.execute(
                """
                INSERT INTO face_samples (user_id, sample_index, sample_blob, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, sample_index, faces[idx].tobytes(), now),
            )
            migrated += 1

        conn.commit()
    finally:
        conn.close()

    return migrated
