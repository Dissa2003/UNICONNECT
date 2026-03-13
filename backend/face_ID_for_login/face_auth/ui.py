from datetime import datetime

import pandas as pd

from .storage import attendance_file_for_today


def load_today_attendance() -> pd.DataFrame:
    file_path = attendance_file_for_today()
    if not file_path.exists():
        raise FileNotFoundError(str(file_path))
    return pd.read_csv(file_path)


def today_date_string() -> str:
    return datetime.now().strftime("%Y-%m-%d")
