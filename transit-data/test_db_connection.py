import os
from pathlib import Path

import psycopg2


def load_database_url():
    env_path = Path(__file__).resolve().parent / ".env"

    for line in env_path.read_text().splitlines():
        line = line.strip()

        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")

    raise RuntimeError("DATABASE_URL not found in transit-data/.env")


def main():
    database_url = load_database_url()

    print("Connecting to Supabase PostgreSQL...")

    with psycopg2.connect(
        database_url,
        connect_timeout=10,
        sslmode="require",
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN (
                    'go_routes',
                    'go_trips',
                    'go_service_dates',
                    'go_stop_times'
                  )
                ORDER BY table_name;
            """)

            tables = [row[0] for row in cursor.fetchall()]

            print("Connection successful!")
            print("GO Transit tables:", ", ".join(tables))

    if len(tables) != 4:
        print("Warning: Expected 4 GO Transit tables.")


if __name__ == "__main__":
    main()
