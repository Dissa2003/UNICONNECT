from face_auth.enroll import enroll_to_legacy_dataset


def main() -> None:
    name = input("Enter the name of the person: ").strip()
    if not name:
        print("Name is required.")
        raise SystemExit(1)

    enroll_to_legacy_dataset(name=name)
    print("Enrollment completed.")


if __name__ == "__main__":
    main()