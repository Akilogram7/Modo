
import csv
import json
from pathlib import Path

# Paths relative to this script
BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "drt-gtfs" / "stops.txt"
OUTPUT_FILE = BASE_DIR / "drt-stops.json"

stops = []

with INPUT_FILE.open("r", encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file)

    for row in reader:
        # Only include actual stops, not station groupings.
        if row.get("location_type", "0") not in ("", "0"):
            continue

        if not row["stop_lat"] or not row["stop_lon"]:
            continue

        stop = {
            "id": row["stop_id"],
            "code": row["stop_code"],
            "name": row["stop_name"],
            "latitude": float(row["stop_lat"]),
            "longitude": float(row["stop_lon"]),
            "agency": "DRT",
        }

        stops.append(stop)

with OUTPUT_FILE.open("w", encoding="utf-8") as file:
    json.dump(stops, file, indent=2)

print(f"Converted {len(stops)} DRT stops.")
print(f"Saved to: {OUTPUT_FILE}")
