CREATE OR REPLACE FUNCTION public.get_go_direct_routes(
    p_origin_stop_id text,
    p_destination_stop_id text,
    p_limit integer DEFAULT 5,
    p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
    trip_id text,
    route text,
    transit_type text,
    destination text,
    boarding_stop_id text,
    alighting_stop_id text,
    scheduled_departure timestamptz,
    scheduled_arrival timestamptz,
    duration_minutes integer
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
            (local_now::date + day_offset) AS service_date
        FROM toronto_clock
        CROSS JOIN generate_series(-1, 1) AS day_offset
    ),
    direct_trips AS (
        SELECT
            t.trip_id,
            r.route_short_name AS route,
            CASE
                WHEN r.route_type = 2 THEN 'train'
                ELSE 'bus'
            END AS transit_type,
            t.trip_headsign AS destination,
            origin.stop_id AS boarding_stop_id,
            target.stop_id AS alighting_stop_id,
            origin.departure_seconds,
            target.arrival_seconds,
            sd.service_date
        FROM public.go_stop_times AS origin
        JOIN public.go_stop_times AS target
            ON target.trip_id = origin.trip_id
           AND target.stop_sequence > origin.stop_sequence
        JOIN public.go_trips AS t
            ON t.trip_id = origin.trip_id
        JOIN public.go_routes AS r
            ON r.route_id = t.route_id
        JOIN public.go_service_dates AS sd
            ON sd.service_id = t.service_id
        JOIN service_days AS days
            ON days.service_date = sd.service_date
        WHERE origin.stop_id = p_origin_stop_id
          AND target.stop_id = p_destination_stop_id
          AND origin.pickup_type = 0
          AND target.drop_off_type = 0
          AND target.arrival_seconds >= origin.departure_seconds
    ),
    timed_trips AS (
        SELECT
            dt.trip_id,
            dt.route,
            dt.transit_type,
            dt.destination,
            dt.boarding_stop_id,
            dt.alighting_stop_id,
            (
                dt.service_date::timestamp
                + dt.departure_seconds * INTERVAL '1 second'
            ) AT TIME ZONE 'America/Toronto'
                AS scheduled_departure,
            (
                dt.service_date::timestamp
                + dt.arrival_seconds * INTERVAL '1 second'
            ) AT TIME ZONE 'America/Toronto'
                AS scheduled_arrival,
            CEIL(
                (dt.arrival_seconds - dt.departure_seconds) / 60.0
            )::integer AS duration_minutes
        FROM direct_trips AS dt
    )
    SELECT
        tt.trip_id,
        tt.route,
        tt.transit_type,
        tt.destination,
        tt.boarding_stop_id,
        tt.alighting_stop_id,
        tt.scheduled_departure,
        tt.scheduled_arrival,
        tt.duration_minutes
    FROM timed_trips AS tt
    WHERE tt.scheduled_departure >= p_now
      AND tt.scheduled_departure < p_now + INTERVAL '24 hours'
    ORDER BY tt.scheduled_departure
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.get_go_direct_routes(
    text, text, integer, timestamptz
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_go_direct_routes(
    text, text, integer, timestamptz
) TO authenticated;