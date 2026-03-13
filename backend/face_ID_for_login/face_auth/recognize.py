import time
from datetime import datetime

import cv2
import numpy as np
from sklearn.neighbors import KNeighborsClassifier

from .config import CASCADE_PATH, FACE_IMAGE_SIZE
from .storage import append_attendance, load_legacy_dataset

try:
    from win32com.client import Dispatch
except Exception:  # pragma: no cover - optional dependency at runtime
    Dispatch = None


def speak(text: str) -> None:
    if Dispatch is None:
        return
    speaker = Dispatch("SAPI.SpVoice")
    speaker.Speak(text)


def build_knn_model(n_neighbors: int = 5) -> KNeighborsClassifier:
    labels, faces = load_legacy_dataset()
    faces = np.asarray(faces).reshape((len(faces), -1))
    knn = KNeighborsClassifier(n_neighbors=n_neighbors)
    knn.fit(faces, labels)
    return knn


def run_attendance_loop() -> None:
    video = cv2.VideoCapture(0)
    facedetect = cv2.CascadeClassifier(str(CASCADE_PATH))

    if facedetect.empty():
        video.release()
        raise RuntimeError(f"Failed to load cascade from {CASCADE_PATH}")

    knn = build_knn_model()
    img_background = cv2.imread("background.png")

    top_offset = 200
    left_offset = 180
    frame_height = 480
    frame_width = 640

    required_height = top_offset + frame_height
    required_width = left_offset + frame_width

    if img_background is None or img_background.shape[0] < required_height or img_background.shape[1] < required_width:
        img_background = np.zeros((required_height, required_width, 3), dtype=np.uint8)

    marked_names = set()

    while True:
        ret, frame = video.read()
        if not ret:
            break

        key = cv2.waitKey(1) & 0xFF
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = facedetect.detectMultiScale(gray, 1.3, 5)

        current_time = datetime.now()
        date_for_file = current_time.strftime("%Y-%m-%d")
        time_str = current_time.strftime("%H:%M:%S")

        for (x, y, w, h) in faces:
            crop_img = frame[y:y + h, x:x + w]
            resized_img = cv2.resize(crop_img, FACE_IMAGE_SIZE).flatten().reshape(1, -1)
            pred = knn.predict(resized_img)
            name = str(pred[0])

            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
            cv2.rectangle(frame, (x, y - 40), (x + w, y), (50, 50, 255), -1)
            cv2.putText(frame, name, (x, y - 10), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 1)

            if key == ord("o"):
                if name not in marked_names:
                    marked_names.add(name)
                    speak(f"{name}'s attendance taken")
                    time.sleep(1)
                    append_attendance(name=name, date_for_file=date_for_file, time_str=time_str)
                else:
                    speak(f"{name} is already marked present")
                    time.sleep(1)

        y_offset = 30
        for marked in marked_names:
            cv2.putText(frame, f"Marked: {marked}", (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            y_offset += 25

        img_background[top_offset:top_offset + frame_height, left_offset:left_offset + frame_width] = frame
        cv2.imshow("Face Recognition - Attendance System", img_background)

        if key == ord("q"):
            break

    video.release()
    cv2.destroyAllWindows()
