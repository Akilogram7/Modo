from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
import csv
import io
import shutil
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent

FEEDS = {
    "drt": {
        "url": "https://maps.durham.ca/OpenDataGTFS/GTFS_Durham_TXT.zip",
        "required": [
            "calendar.txt",
            "routes.txt",
            "trips.txt",
            "stop_times.txt",
            "stops.txt",
        ],
        "calendar": "calendar.txt",
    },
    "go": {
        "url": "https://assets.metrolinx.com/raw/upload/Documents/Metrolinx/Open%20Data/GO-GTFS.zip",
        "required": [
            "calendar_dates.txt",
            "routes.txt",
            "trips.txt",
            "stop_times.txt",
            "stops.txt",
        ],
        "calendar": "calendar_dates.txt",
    },
}


def validate_archive(archive, config):
    names = archive.namelist()

    if len(names) != len(set(names)):
        raise RuntimeError("Duplicate ZIP entries detected")

    if not set(config["required"]).issubset(names):
        raise RuntimeError("Missing required GTFS files")

    for name in names:
        path = Path(name)
        if path.is_absolute() or ".." in path.parts:
            raise RuntimeError(f"Unsafe ZIP path: {name}")

    with archive.open(config["calendar"]) as file:
        rows = list(
            csv.DictReader(
                io.TextIOWrapper(file, encoding="utf-8-sig")
            )
        )

    if config["calendar"] == "calendar.txt":
        dates = [row["end_date"] for row in rows]
    else:
        dates = [
            row["date"]
            for row in rows
            if row["exception_type"] == "1"
        ]

    if not dates:
        raise RuntimeError("No GTFS service dates found")

    latest = date.fromisoformat(
        f"{max(dates)[:4]}-{max(dates)[4:6]}-{max(dates)[6:]}"
    )

    if latest < date.today() + timedelta(days=7):
        raise RuntimeError(
            f"GTFS schedule expires too soon: {latest}"
        )

    print(f"  Schedule valid through {latest}")


def download_feed(agency, config):
    print(f"Downloading {agency.upper()} GTFS...", flush=True)

    request = urllib.request.Request(
        config["url"],
        headers={"User-Agent": "ModoTransitUpdater/1.0"},
    )

    with TemporaryDirectory(dir=ROOT) as temp:
        temp_path = Path(temp)
        zip_path = temp_path / "feed.zip"
        extracted = temp_path / "extracted"
        extracted.mkdir()

        with urllib.request.urlopen(request, timeout=120) as response:
            with zip_path.open("wb") as output:
                shutil.copyfileobj(response, output)

        with zipfile.ZipFile(zip_path) as archive:
            validate_archive(archive, config)
            archive.extractall(extracted)

        destination = ROOT / f"{agency}-gtfs"
        backup = ROOT / f"{agency}-gtfs-backup"

        if backup.exists():
            shutil.rmtree(backup)

        if destination.exists():
            destination.rename(backup)

        try:
            extracted.rename(destination)
        except Exception:
            if backup.exists():
                backup.rename(destination)
            raise

        if backup.exists():
            shutil.rmtree(backup)

    print(f"{agency.upper()} download completed.")


def main():
    for agency, config in FEEDS.items():
        download_feed(agency, config)


if __name__ == "__main__":
    main()