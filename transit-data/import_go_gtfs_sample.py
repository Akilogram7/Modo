import csv
import os
from io import StringIO
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent
GTFS = ROOT / "go-gtfs"


def database_url():
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("DATABASE_URL not found")


def read_csv(filename):
    with (GTFS / filename).open(
        newline="", encoding="utf-8-sig"
    ) as file:
        yield from csv.DictReader(file)


def time_to_seconds(value):
    hours, minutes, seconds = map(int, value.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def copy_rows(cursor, table, columns, rows):
    buffer = StringIO()
    writer = csv.writer(buffer)

    for row in rows:
        writer.writerow(row)

    buffer.seek(0)

    cursor.copy_expert(
        f"COPY public.{table} ({', '.join(columns)}) "
        "FROM STDIN WITH (FORMAT CSV)",
        buffer,
    )


def import_sample():
    print("Preparing small GO Transit test import...")

    routes = list(read_csv("routes.txt"))[:5]
    route_ids = {row["route_id"] for row in routes}

    trips = [
        row for row in read_csv("trips.txt")
        if row["route_id"] in route_ids
    ][:10]

    trip_ids = {row["trip_id"] for row in trips}
    service_ids = {row["service_id"] for row in trips}

    dates = [
        row for row in read_csv("calendar_dates.txt")
        if row["service_id"] in service_ids
        and row["exception_type"] == "1"
    ]

    stop_times = [
        row for row in read_csv("stop_times.txt")
        if row["trip_id"] in trip_ids
    ]

    with psycopg2.connect(
        database_url(),
        sslmode="require",
        connect_timeout=10,
    ) as connection:
        with connection.cursor() as cursor:
            copy_rows(
                cursor,
                "go_routes",
                ["route_id", "route_short_name",
                 "route_long_name", "route_type"],
                [
                    (
                        row["route_id"],
                        row["route_short_name"],
                        row["route_long_name"],
                        int(row["route_type"]),
                    )
                    for row in routes
                ],
            )

            copy_rows(
                cursor,
                "go_service_dates",
                ["service_id", "service_date"],
                [
                    (
                        row["service_id"],
                        f'{row["date"][:4]}-{row["date"][4:6]}-{row["date"][6:]}',
                    )
                    for row in dates
                ],
            )

            copy_rows(
                cursor,
                "go_trips",
                ["trip_id", "route_id", "service_id",
                 "trip_headsign"],
                [
                    (
                        row["trip_id"],
                        row["route_id"],
                        row["service_id"],
                        row["trip_headsign"],
                    )
                    for row in trips
                ],
            )

            copy_rows(
                cursor,
                "go_stop_times",
                ["trip_id", "stop_id", "stop_sequence",
                 "arrival_seconds", "departure_seconds",
                 "pickup_type", "drop_off_type"],
                [
                    (
                        row["trip_id"],
                        row["stop_id"],
                        int(row["stop_sequence"]),
                        time_to_seconds(row["arrival_time"]),
                        time_to_seconds(row["departure_time"]),
                        row["pickup_type"] or None,
                        row["drop_off_type"] or None,
                    )
                    for row in stop_times
                ],
            )

    print("Sample import completed successfully!")
    print("Routes:", len(routes))
    print("Service dates:", len(dates))
    print("Trips:", len(trips))
    print("Stop times:", len(stop_times))


if __name__ == "__main__":
    import_sample()
