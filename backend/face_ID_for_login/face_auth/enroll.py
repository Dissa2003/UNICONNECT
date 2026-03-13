import cv2
import numpy as np

from .config import CASCADE_PATH, DEFAULT_SAMPLE_TARGET, FACE_IMAGE_SIZE
from .storage import append_legacy_dataset


def capture_face_samples(name: str, target_samples: int = DEFAULT_SAMPLE_TARGET, video_source: int = 0) -> np.ndarray:
    video = cv2.VideoCapture(video_source)
    facedetect = cv2.CascadeClassifier(str(CASCADE_PATH))

    if facedetect.empty():
        video.release()
        raise RuntimeError(f"Failed to load cascade from {CASCADE_PATH}")

    samples = []
    frame_index = 0

    while True:
        ret, frame = video.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = facedetect.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            crop_img = frame[y:y + h, x:x + w]
            resized_img = cv2.resize(crop_img, FACE_IMAGE_SIZE)
            if len(samples) < target_samples and frame_index % 10 == 0:
                samples.append(resized_img)
            frame_index += 1

            cv2.putText(frame, str(len(samples)), (50, 50), cv2.FONT_HERSHEY_COMPLEX, 1, (50, 50, 255), 1)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (50, 50, 255), 1)

        cv2.imshow("video", frame)
        if len(samples) >= target_samples or cv2.waitKey(1) == ord("q"):
            break

    video.release()
    cv2.destroyAllWindows()

    if not samples:
        raise RuntimeError("No faces captured. Please try again.")

    return np.asarray(samples)


def enroll_to_legacy_dataset(name: str, target_samples: int = DEFAULT_SAMPLE_TARGET, video_source: int = 0) -> None:
    samples = capture_face_samples(name=name, target_samples=target_samples, video_source=video_source)
    append_legacy_dataset(name=name, face_samples=samples)
