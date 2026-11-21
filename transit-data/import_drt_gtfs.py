
import csv
from datetime import datetime, timedelta
from io import StringIO
from pathlib import Path
import os
from datetime import date
import psycopg2

ROOT = Path(__file__).resolve().parent
GTFS = ROOT / "drt-gtfs"

TABLES = {
    "drt_routes": [
        "route_id", "route_short_name",
        "route_long_name", "route_type",
    ],
    "drt_service_dates": ["service_id", "service_date"],
    "drt_trips": [
        "trip_id", "route_id", "service_id",
        "trip_headsign", "direction_id",
    ],
    "drt_stop_times": [
        "trip_id", "stop_id", "stop_sequence",
        "arrival_seconds", "departure_seconds",
        "pickup_type", "drop_off_type",
    ],
}


def database_url():
    url = os.environ.get("DATABASE_URL")

    if url:
        return url

    env_file = ROOT / ".env"

    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.strip().startswith("DATABASE_URL="):
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


def service_dates():
    dates = {}

    for row in read_csv("calendar.txt"):
        start = datetime.strptime(row["start_date"], "%Y%m%d").date()
        end = datetime.strptime(row["end_date"], "%Y%m%d").date()
        current = start

        while current <= end:
            day = current.strftime("%A").lower()
            if row[day] == "1":
                dates[(row["service_id"], current)] = True
            current += timedelta(days=1)

    exceptions = GTFS / "calendar_dates.txt"
    if exceptions.exists():
        for row in read_csv("calendar_dates.txt"):
            key = (
                row["service_id"],
                datetime.strptime(row["date"], "%Y%m%d").date(),
            )
            if row["exception_type"] == "1":
                dates[key] = True
            elif row["exception_type"] == "2":
                dates.pop(key, None)

    for service_id, date in sorted(dates):
        yield (service_id, date.isoformat())


def transform_rows(table):
    if table == "drt_service_dates":
        yield from service_dates()
        return

    filenames = {
        "drt_routes": "routes.txt",
        "drt_trips": "trips.txt",
        "drt_stop_times": "stop_times.txt",
    }

    for row in read_csv(filenames[table]):
        if table == "drt_routes":
            yield (
                row["route_id"],
                row["route_short_name"],
                row["route_long_name"],
                int(row["route_type"]),
            )

        elif table == "drt_trips":
            yield (
                row["trip_id"],
                row["route_id"],
                row["service_id"],
                row["trip_headsign"],
                int(row["direction_id"]) if row["direction_id"] else None,
            )

        elif table == "drt_stop_times":
            yield (
                row["trip_id"],
                row["stop_id"],
                int(row["stop_sequence"]),
                time_to_seconds(row["arrival_time"]),
                time_to_seconds(row["departure_time"]),
                int(row["pickup_type"] or 0),
                int(row["drop_off_type"] or 0),
            )


def copy_to_stage(cursor, table):
    columns = TABLES[table]
    buffer = StringIO()
    writer = csv.writer(buffer)
    count = 0

    def flush():
        nonlocal buffer, writer
        buffer.seek(0)
        cursor.copy_expert(
            f"COPY stage_{table} ({', '.join(columns)}) "
            "FROM STDIN WITH (FORMAT CSV)",
            buffer,
        )
        buffer = StringIO()
        writer = csv.writer(buffer)

    for row in transform_rows(table):
        writer.writerow(row)
        count += 1

        if count % 10000 == 0:
            flush()
            print(f"  {table}: {count:,} rows staged", flush=True)

    if buffer.tell() > 0:
        flush()

    print(f"  {table}: {count:,} rows staged", flush=True)
    return count


def main():
    print("Connecting to Supabase PostgreSQL...")

    with psycopg2.connect(
        database_url(),
        sslmode="require",
        connect_timeout=15,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(73421902)")

            print("Creating temporary staging tables...")
            for table in TABLES:
                cursor.execute(
                    f"CREATE TEMP TABLE stage_{table} "
                    f"(LIKE public.{table} INCLUDING DEFAULTS) "
                    "ON COMMIT DROP"
                )

            print("Loading DRT GTFS data...")
            counts = {}
            for table in TABLES:
                counts[table] = copy_to_stage(cursor, table)

            print("Validating data...")

            minimum_counts = {
                "drt_routes": 1,
                "drt_trips": 1,
                "drt_stop_times": 1,
            }

            for table, minimum in minimum_counts.items():
                if counts[table] < minimum:
                    raise RuntimeError(
                        f"{table}: expected at least {minimum} rows, "
                        f"found {counts[table]}"
                    )

            if counts["drt_service_dates"] == 0:
                raise RuntimeError("No DRT service dates generated")

            #database protection from outdated timings
            latest_service_date = max(
                service_date
                for _, service_date in service_dates()
            )

            if date.fromisoformat(latest_service_date) < date.today() + timedelta(days=7):
                raise RuntimeError(
                    "DRT GTFS data expires within 7 days. "
                    "Refusing to replace the existing schedule."
                )

            checks = {
                "missing routes": """
                    SELECT COUNT(*) FROM stage_drt_trips t
                    LEFT JOIN stage_drt_routes r
                      ON t.route_id = r.route_id
                    WHERE r.route_id IS NULL
                """,
                "missing trips": """
                    SELECT COUNT(*) FROM stage_drt_stop_times s
                    LEFT JOIN stage_drt_trips t
                      ON s.trip_id = t.trip_id
                    WHERE t.trip_id IS NULL
                """,
                "missing service dates": """
                    SELECT COUNT(*) FROM stage_drt_trips t
                    LEFT JOIN (
                        SELECT DISTINCT service_id
                        FROM stage_drt_service_dates
                    ) d ON t.service_id = d.service_id
                    WHERE d.service_id IS NULL
                """,
                "duplicate routes": """
                    SELECT COUNT(*) - COUNT(DISTINCT route_id)
                    FROM stage_drt_routes
                """,
                "duplicate trips": """
                    SELECT COUNT(*) - COUNT(DISTINCT trip_id)
                    FROM stage_drt_trips
                """,
                "duplicate stop times": """
                    SELECT COUNT(*) -
                           COUNT(DISTINCT (trip_id, stop_sequence))
                    FROM stage_drt_stop_times
                """,
            }

            for name, query in checks.items():
                cursor.execute(query)
                count = cursor.fetchone()[0]
                if count != 0:
                    raise RuntimeError(
                        f"Validation failed: {count} {name}"
                    )

            print("Validation passed.")
            print("Replacing DRT schedule records...")
            for table in TABLES:
                cursor.execute(f"SELECT COUNT(*) FROM stage_{table}")
                staged_count = cursor.fetchone()[0]

                cursor.execute(f"SELECT COUNT(*) FROM public.{table}")
                existing_count = cursor.fetchone()[0]

                if staged_count == 0:
                    raise RuntimeError(
                        f"{table}: staged data is empty"
                    )

                if existing_count > 0 and staged_count < existing_count * 0.5:
                    raise RuntimeError(
                        f"{table}: staged data is less than 50% "
                        "of existing data. Refusing replacement."
                    )

            # Transactional: a failure rolls back the replacement.
            # Only DRT tables are modified.
            cursor.execute("""
                TRUNCATE TABLE
                    public.drt_stop_times,
                    public.drt_trips,
                    public.drt_service_dates,
                    public.drt_routes
            """)

            for table, columns in TABLES.items():
                cursor.execute(
                    f"INSERT INTO public.{table} "
                    f"({', '.join(columns)}) "
                    f"SELECT {', '.join(columns)} "
                    f"FROM stage_{table}"
                )

            print("DRT import completed successfully.")
            for table, count in counts.items():
                print(f"  {table}: {count:,} records")

        # Connection context commits on successful completion.
        # An exception rolls back the entire transaction.


if __name__ == "__main__":
    main()
