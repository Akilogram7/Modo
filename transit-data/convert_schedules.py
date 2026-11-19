
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GTFS = ROOT / "drt-gtfs"
OUTPUT = ROOT.parent / "app/src/features/transit/data/drt-schedules.json"


def read_csv(filename):
    with (GTFS / filename).open(
        newline="", encoding="utf-8-sig"
    ) as file:
        return list(csv.DictReader(file))


def minutes_from_gtfs(value):
    hours, minutes, seconds = map(int, value.split(":"))
    # Preserve seconds by rounding up to the next minute.
    return hours * 60 + minutes + (1 if seconds else 0)


routes_by_id = {
    row["route_id"]: row["route_short_name"]
    for row in read_csv("routes.txt")
}

trips = {
    row["trip_id"]: {
        "route": routes_by_id.get(row["route_id"], row["route_id"]),
        "destination": row["trip_headsign"],
        "service": row["service_id"],
    }
    for row in read_csv("trips.txt")
}

route_values = []
destination_values = []
service_values = []

route_indexes = {}
destination_indexes = {}
service_indexes = {}


def get_index(value, values, indexes):
    if value not in indexes:
        indexes[value] = len(values)
        values.append(value)

    return indexes[value]


schedules = defaultdict(list)

with (GTFS / "stop_times.txt").open(
    newline="", encoding="utf-8-sig"
) as file:
    for row in csv.DictReader(file):
        trip = trips.get(row["trip_id"])

        if not trip or not row["arrival_time"]:
            continue

        route_index = get_index(
            trip["route"], route_values, route_indexes
        )

        destination_index = get_index(
            row["stop_headsign"] or trip["destination"],
            destination_values,
            destination_indexes,
        )

        service_index = get_index(
            trip["service"], service_values, service_indexes
        )

        arrival_minutes = minutes_from_gtfs(row["arrival_time"])
        pickup_type = int(row["pickup_type"] or "0")

        schedules[row["stop_id"]].append([
            route_index,
            destination_index,
            service_index,
            arrival_minutes,
            pickup_type,
        ])

for arrivals in schedules.values():
    arrivals.sort(key=lambda arrival: arrival[3])

result = {
    "routes": route_values,
    "destinations": destination_values,
    "services": service_values,
    "calendar": read_csv("calendar.txt"),
    "calendarDates": read_csv("calendar_dates.txt"),
    "stops": schedules,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with OUTPUT.open("w", encoding="utf-8") as file:
    json.dump(result, file, separators=(",", ":"))

print(f"Created: {OUTPUT}")
print(f"Stops with schedules: {len(schedules)}")
print(f"Trips processed: {len(trips)}")
print(f"File size: {OUTPUT.stat().st_size / 1024 / 1024:.2f} MB")
