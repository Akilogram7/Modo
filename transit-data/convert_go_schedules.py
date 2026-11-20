import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GTFS = ROOT / "go-gtfs"
OUTPUT = ROOT.parent / "app/src/features/transit/data/go-schedules.json"


def read_csv(filename):
    with (GTFS / filename).open(
        newline="", encoding="utf-8-sig"
    ) as file:
        yield from csv.DictReader(file)


# Service IDs and their operating dates
service_dates = defaultdict(list)

for row in read_csv("calendar_dates.txt"):
    if row["exception_type"] == "1":
        service_dates[row["service_id"]].append(row["date"])


# GO routes
routes = {}

for row in read_csv("routes.txt"):
    if row["route_type"] not in ("2", "3"):
        continue

    routes[row["route_id"]] = [
        row["route_short_name"] or row["route_long_name"],
        "train" if row["route_type"] == "2" else "bus",
    ]


# Trip details are stored once
trips = {}

for row in read_csv("trips.txt"):
    if row["service_id"] not in service_dates:
        continue

    route = routes.get(row["route_id"])

    if route is None:
        continue

    trips[row["trip_id"]] = [
        route[0],                 # Route name
        route[1],                 # Bus or train
        row["trip_headsign"],    # Destination
        row["service_id"],       # Service calendar reference
    ]


# Stop visits reference trip IDs instead of repeating details
stops = defaultdict(list)

for row in read_csv("stop_times.txt"):
    if row["trip_id"] not in trips:
        continue

    stops[row["stop_id"]].append([
        row["trip_id"],
        row["arrival_time"],
        row["departure_time"],
    ])


for visits in stops.values():
    visits.sort(key=lambda visit: visit[2])


output = {
    "serviceDates": dict(service_dates),
    "trips": trips,
    "stops": dict(stops),
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with OUTPUT.open("w", encoding="utf-8") as file:
    json.dump(output, file, separators=(",", ":"))


print("GO schedules generated successfully.")
print("Stops with schedules:", len(stops))
print("Trips:", len(trips))
print("Total stop visits:", sum(len(v) for v in stops.values()))
print("Output:", OUTPUT)
