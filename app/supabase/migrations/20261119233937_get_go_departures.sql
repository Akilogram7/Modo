
CREATE OR REPLACE FUNCTION public.get_go_departures(
    p_stop_id TEXT,
    p_limit INTEGER DEFAULT 5,
    p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    trip_id TEXT,
    route TEXT,
    transit_type TEXT,
    destination TEXT,
    scheduled_departure TIMESTAMPTZ,
    minutes_until INTEGER
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    WITH toronto_clock AS (
    SELECT
        p_now AT TIME ZONE 'America/Toronto' AS local_now
    ),
    service_days AS (
        SELECT
            (local_now::date + offset_day)::date AS service_date,
            local_now
        FROM toronto_clock
        CROSS JOIN generate_series(-1, 1) AS offset_day
    ),
    departures AS (
        SELECT
            st.trip_id,
            COALESCE(
                NULLIF(r.route_short_name, ''),
                r.route_long_name
            ) AS route,
            CASE
                WHEN r.route_type = 2 THEN 'train'
                ELSE 'bus'
            END AS transit_type,
            t.trip_headsign AS destination,
            (
                sd.service_date::timestamp
                + st.departure_seconds * INTERVAL '1 second'
            ) AT TIME ZONE 'America/Toronto'
                AS scheduled_departure
        FROM service_days sd
        JOIN public.go_service_dates d
            ON d.service_date = sd.service_date
        JOIN public.go_trips t
            ON t.service_id = d.service_id
        JOIN public.go_routes r
            ON r.route_id = t.route_id
        JOIN public.go_stop_times st
            ON st.trip_id = t.trip_id
           AND st.stop_id = p_stop_id
        WHERE COALESCE(st.pickup_type, 0) = 0
    )
    SELECT
        dep.trip_id,
        dep.route,
        dep.transit_type,
        dep.destination,
        dep.scheduled_departure,
        CEIL(
            EXTRACT(EPOCH FROM (dep.scheduled_departure - p_now)) / 60
        )::integer AS minutes_until
    FROM departures dep
    WHERE dep.scheduled_departure >= p_now
      AND dep.scheduled_departure < p_now + INTERVAL '24 hours'
    ORDER BY dep.scheduled_departure, dep.trip_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
$$;

-- Restrict execution to authenticated app users.
REVOKE ALL ON FUNCTION public.get_go_departures(
    TEXT, INTEGER, TIMESTAMPTZ
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_go_departures(
    TEXT, INTEGER, TIMESTAMPTZ
) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_go_departures(
    TEXT, INTEGER, TIMESTAMPTZ
) TO authenticated;
