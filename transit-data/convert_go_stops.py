import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GTFS = ROOT / "go-gtfs"
OUTPUT = ROOT.parent / "app/src/features/transit/data/go-stops.json"

# Determine which stops are served by buses and trains.
routes = {}

with open(GTFS / "routes.txt", newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        routes[row["route_id"]] = row["route_type"]

trips = {}

with open(GTFS / "trips.txt", newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        trips[row["trip_id"]] = routes.get(row["route_id"])

stop_types = {}

with open(GTFS / "stop_times.txt", newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        route_type = trips.get(row["trip_id"])

        if route_type in ("2", "3"):
            stop_types.setdefault(row["stop_id"], set()).add(route_type)

stops = []

with open(GTFS / "stops.txt", newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        stop_id = row["stop_id"]
        types = stop_types.get(stop_id, set())

        if not types:
            continue

        if not row["stop_lat"] or not row["stop_lon"]:
            continue

        if types == {"2"}:
            transit_type = "train"
        elif types == {"3"}:
            transit_type = "bus"
        else:
            transit_type = "both"

        stops.append({
            "id": stop_id,
            "code": row.get("stop_code") or stop_id,
            "name": row["stop_name"],
            "latitude": float(row["stop_lat"]),
            "longitude": float(row["stop_lon"]),
            "agency": "GO",
            "transitType": transit_type,
        })

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(stops, f, separators=(",", ":"))

print(f"GO stops exported: {len(stops)}")
print(f"Bus-only stops: {sum(s['transitType'] == 'bus' for s in stops)}")
print(f"Train-only stops: {sum(s['transitType'] == 'train' for s in stops)}")
print(f"Bus + train stops: {sum(s['transitType'] == 'both' for s in stops)}")
print(f"Output: {OUTPUT}")
