from face_auth.recognize import run_attendance_loop


def main() -> None:
    try:
        run_attendance_loop()
    except FileNotFoundError:
        print("Enrollment data not found. Please run add_faces.py first to register at least one face.")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
