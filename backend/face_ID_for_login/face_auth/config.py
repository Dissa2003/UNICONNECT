from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ATTENDANCE_DIR = BASE_DIR / "Attendence"

CASCADE_PATH = DATA_DIR / "face.xml"
NAMES_PKL_PATH = DATA_DIR / "names.pkl"
FACES_PKL_PATH = DATA_DIR / "faces_data.pkl"
AUTH_DB_PATH = DATA_DIR / "auth.db"

FACE_IMAGE_SIZE = (50, 50)
DEFAULT_SAMPLE_TARGET = 100
