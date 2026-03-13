from datetime import datetime
from typing import Dict, Optional

import cv2

from .config import CASCADE_PATH, FACE_IMAGE_SIZE
from .liveness import check_liveness
from .recognize import build_knn_model


def verify_face_login(confidence_threshold: float = 0.65, video_source: int = 0) -> Dict[str, Optional[float]]:
    """Basic face login verification using KNN distance as confidence proxy.

    This is a reusable auth flow; API/server integration is added in later steps.
    """
    video = cv2.VideoCapture(video_source)
    facedetect = cv2.CascadeClassifier(str(CASCADE_PATH))
    knn = build_knn_model()

    if facedetect.empty():
        video.release()
        raise RuntimeError(f"Failed to load cascade from {CASCADE_PATH}")

    result = {
        "success": False,
        "user_id": None,
        "confidence": None,
        "reason": "no_face_detected",
        "timestamp": datetime.utcnow().isoformat(),
        "liveness_status": "unknown",
    }

    ret, frame = video.read()
    if not ret:
        video.release()
        result["reason"] = "camera_read_failed"
        return result

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facedetect.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        liveness = check_liveness(frame, (x, y, w, h))
        result["liveness_status"] = liveness.get("status", "unknown")

        crop_img = frame[y:y + h, x:x + w]
        resized_img = cv2.resize(crop_img, FACE_IMAGE_SIZE).flatten().reshape(1, -1)

        distance, _ = knn.kneighbors(resized_img, n_neighbors=1, return_distance=True)
        confidence = float(1.0 / (1.0 + distance[0][0]))
        user_id = str(knn.predict(resized_img)[0])

        result["user_id"] = user_id
        result["confidence"] = confidence

        if confidence >= confidence_threshold:
            result["success"] = True
            result["reason"] = "verified"
        else:
            result["reason"] = "below_threshold"
        break

    video.release()
    return result
