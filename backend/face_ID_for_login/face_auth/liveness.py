from typing import Any, Dict


def check_liveness(frame: Any, face_box: tuple) -> Dict[str, str]:
    """Placeholder hook for anti-spoof/liveness logic.

    Integrate blink detection, texture analysis, or challenge-response later.
    """
    _ = (frame, face_box)
    return {"status": "unknown", "reason": "liveness_not_implemented"}
