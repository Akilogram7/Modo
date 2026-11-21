import csv
import os
from io import StringIO
from pathlib import Path
from datetime import date, timedelta
import psycopg2

ROOT = Path(__file__).resolve().parent
GTFS = ROOT / "go-gtfs"

TABLES = {
    "go_routes": (
        "routes.txt",
        ["route_id", "route_short_name", "route_long_name", "route_type"],
    ),
    "go_service_dates": (
        "calendar_dates.txt",
        ["service_id", "service_date"],
    ),
    "go_trips": (
        "trips.txt",
        ["trip_id", "route_id", "service_id", "trip_headsign"],
    ),
    "go_stop_times": (
        "stop_times.txt",
        [
            "trip_id",
            "stop_id",
            "stop_sequence",
            "arrival_seconds",
            "departure_seconds",
            "pickup_type",
            "drop_off_type",
        ],
    ),
}


def database_url():
    url = os.environ.get("DATABASE_URL")

    if url:
        return url

    env_file = ROOT / ".env"

    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
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


def transform_rows(table):
    filename = TABLES[table][0]

    for row in read_csv(filename):
        if table == "go_routes":
            if row["route_type"] not in ("2", "3"):
                continue
            yield (
                row["route_id"],
                row["route_short_name"],
                row["route_long_name"],
                int(row["route_type"]),
            )

        elif table == "go_service_dates":
            if row["exception_type"] != "1":
                continue
            date = row["date"]
            yield (
                row["service_id"],
                f"{date[:4]}-{date[4:6]}-{date[6:]}",
            )

        elif table == "go_trips":
            yield (
                row["trip_id"],
                row["route_id"],
                row["service_id"],
                row["trip_headsign"],
            )

        elif table == "go_stop_times":
            yield (
                row["trip_id"],
                row["stop_id"],
                int(row["stop_sequence"]),
                time_to_seconds(row["arrival_time"]),
                time_to_seconds(row["departure_time"]),
                row["pickup_type"] or None,
                row["drop_off_type"] or None,
            )


def copy_to_stage(cursor, table, rows):
    columns = TABLES[table][1]
    buffer = StringIO()
    writer = csv.writer(buffer)
    count = 0

    def flush():
        nonlocal buffer
        buffer.seek(0)
        cursor.copy_expert(
            f"COPY stage_{table} ({', '.join(columns)}) "
            "FROM STDIN WITH (FORMAT CSV)",
            buffer,
        )
        buffer = StringIO()

    for row in rows:
        writer.writerow(row)
        count += 1

        if count % 10000 == 0:
            flush()
            writer = csv.writer(buffer)
            print(f"  {table}: {count:,} rows staged", flush=True)

    if buffer.tell() > 0:
        flush()

    print(f"  {table}: {count:,} rows staged", flush=True)


def main():
    print("Connecting to Supabase PostgreSQL...")

    with psycopg2.connect(
        database_url(),
        sslmode="require",
        connect_timeout=15,
    ) as connection:
        with connection.cursor() as cursor:
            # Prevent two imports from running simultaneously.
            cursor.execute("SELECT pg_advisory_xact_lock(73421901)")

            print("Creating temporary staging tables...")

            for table in TABLES:
                cursor.execute(
                    f"CREATE TEMP TABLE stage_{table} "
                    f"(LIKE public.{table} INCLUDING DEFAULTS) "
                    "ON COMMIT DROP"
                )

            print("Loading GTFS data into staging tables...")

            for table in TABLES:
                copy_to_stage(cursor, table, transform_rows(table))

            print("Validating staged data...")

            for table in TABLES:
                cursor.execute(f"SELECT COUNT(*) FROM stage_{table}")
                count = cursor.fetchone()[0]

                if count == 0:
                    raise RuntimeError(
                        f"{table} is empty. Refusing to replace live data."
                    )

            cursor.execute("""
                SELECT MAX(service_date)
                FROM stage_go_service_dates
            """)

            latest_date = cursor.fetchone()[0]

            if latest_date is None or latest_date < date.today() + timedelta(days=7):
                raise RuntimeError(
                    "GO schedule does not cover the next 7 days. "
                    "Refusing to replace live data."
                )

            cursor.execute("""
                SELECT COUNT(*)
                FROM stage_go_trips t
                LEFT JOIN stage_go_routes r
                  ON r.route_id = t.route_id
                WHERE r.route_id IS NULL
            """)
            missing_routes = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*)
                FROM stage_go_stop_times s
                LEFT JOIN stage_go_trips t
                  ON t.trip_id = s.trip_id
                WHERE t.trip_id IS NULL
            """)
            missing_trips = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*)
                FROM stage_go_trips t
                LEFT JOIN stage_go_service_dates d
                  ON d.service_id = t.service_id
                WHERE d.service_id IS NULL
            """)
            missing_service_dates = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*) - COUNT(DISTINCT trip_id)
                FROM stage_go_trips
            """)
            duplicate_trips = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*) - COUNT(DISTINCT (trip_id, stop_sequence))
                FROM stage_go_stop_times
            """)
            duplicate_stop_times = cursor.fetchone()[0]

            if duplicate_trips or duplicate_stop_times:
                raise RuntimeError(
                    "Duplicate GTFS records detected: "
                    f"{duplicate_trips} duplicate trips, "
                    f"{duplicate_stop_times} duplicate stop times"
                )

            if missing_routes or missing_trips or missing_service_dates:
                raise RuntimeError(
                    "GTFS validation failed: "
                    f"{missing_routes} missing routes, "
                    f"{missing_trips} missing trips, "
                    f"{missing_service_dates} trips without service dates"
                )

            print("Validation passed.")
            print("Replacing existing GO schedule records...")

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

            # Only GO tables are affected.
            # TRUNCATE is transactional in PostgreSQL.
            cursor.execute("""
                TRUNCATE TABLE
                    public.go_stop_times,
                    public.go_trips,
                    public.go_service_dates,
                    public.go_routes
            """)

            for table in TABLES:
                columns = ", ".join(TABLES[table][1])
                cursor.execute(
                    f"INSERT INTO public.{table} ({columns}) "
                    f"SELECT {columns} FROM stage_{table}"
                )
                print(f"  Inserted {table}", flush=True)

            print("Checking final row counts...")

            for table in TABLES:
                cursor.execute(f"SELECT COUNT(*) FROM public.{table}")
                count = cursor.fetchone()[0]
                print(f"  {table}: {count:,}", flush=True)

        # The transaction commits here if everything succeeded.

    print("GO Transit import completed successfully!")


if __name__ == "__main__":
    main()
