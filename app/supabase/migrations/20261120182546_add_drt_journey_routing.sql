CREATE OR REPLACE FUNCTION public.get_drt_journeys(
    p_origin_stop_id text,
    p_destination_stop_id text,
    p_limit integer DEFAULT 5,
    p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
    first_trip_id text,
    first_route text,
    first_headsign text,
    boarding_stop_id text,
    transfer_stop_id text,
    second_trip_id text,
    second_route text,
    second_headsign text,
    alighting_stop_id text,
    departure_time timestamptz,
    transfer_arrival_time timestamptz,
    transfer_departure_time timestamptz,
    arrival_time timestamptz,
    transfer_count integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
WITH service_days AS (
    SELECT
        d.service_id,
        d.service_date
    FROM public.drt_service_dates d
    WHERE d.service_date BETWEEN
        ((p_now AT TIME ZONE 'America/Toronto')::date - 1)
        AND
        ((p_now AT TIME ZONE 'America/Toronto')::date + 1)
),
visits AS (
    SELECT
        st.trip_id,
        t.route_id,
        r.route_short_name,
        t.trip_headsign,
        st.stop_id,
        st.stop_sequence,
        st.pickup_type,
        st.drop_off_type,
        (
            sd.service_date::timestamp
            + st.departure_seconds * INTERVAL '1 second'
        ) AT TIME ZONE 'America/Toronto' AS dep_time,
        (
            sd.service_date::timestamp
            + st.arrival_seconds * INTERVAL '1 second'
        ) AT TIME ZONE 'America/Toronto' AS arr_time
    FROM public.drt_stop_times st
    JOIN public.drt_trips t ON t.trip_id = st.trip_id
    JOIN public.drt_routes r ON r.route_id = t.route_id
    JOIN service_days sd ON sd.service_id = t.service_id
),
first_boardings AS (
    SELECT *
    FROM visits
    WHERE stop_id = p_origin_stop_id
      AND pickup_type = 0
      AND dep_time BETWEEN p_now AND p_now + INTERVAL '24 hours'
),
last_alightings AS (
    SELECT *
    FROM visits
    WHERE stop_id = p_destination_stop_id
      AND drop_off_type = 0
),
direct_journeys AS (
    SELECT
        a.trip_id AS first_trip_id,
        a.route_short_name AS first_route,
        a.trip_headsign AS first_headsign,
        a.stop_id AS boarding_stop_id,
        NULL::text AS transfer_stop_id,
        NULL::text AS second_trip_id,
        NULL::text AS second_route,
        NULL::text AS second_headsign,
        b.stop_id AS alighting_stop_id,
        a.dep_time AS departure_time,
        NULL::timestamptz AS transfer_arrival_time,
        NULL::timestamptz AS transfer_departure_time,
        b.arr_time AS arrival_time,
        0 AS transfer_count
    FROM first_boardings a
    JOIN last_alightings b
      ON a.trip_id = b.trip_id
     AND a.stop_sequence < b.stop_sequence
     AND b.arr_time > a.dep_time
),
first_legs AS (
    SELECT
        a.trip_id,
        a.route_short_name,
        a.trip_headsign,
        a.stop_id AS boarding_stop_id,
        a.dep_time,
        x.stop_id AS transfer_stop_id,
        x.arr_time AS transfer_arrival_time
    FROM first_boardings a
    JOIN visits x
      ON x.trip_id = a.trip_id
     AND x.stop_sequence > a.stop_sequence
     AND x.drop_off_type = 0
),
transfer_journeys AS (
    SELECT
        f.trip_id AS first_trip_id,
        f.route_short_name AS first_route,
        f.trip_headsign AS first_headsign,
        f.boarding_stop_id,
        f.transfer_stop_id,
        c.trip_id AS second_trip_id,
        c.route_short_name AS second_route,
        c.trip_headsign AS second_headsign,
        z.stop_id AS alighting_stop_id,
        f.dep_time AS departure_time,
        f.transfer_arrival_time,
        c.dep_time AS transfer_departure_time,
        z.arr_time AS arrival_time,
        1 AS transfer_count
    FROM first_legs f
    JOIN visits c
      ON c.stop_id = f.transfer_stop_id
     AND c.pickup_type = 0
     AND c.trip_id <> f.trip_id
     AND c.dep_time >= f.transfer_arrival_time + INTERVAL '5 minutes'
     AND c.dep_time <= f.transfer_arrival_time + INTERVAL '90 minutes'
    JOIN last_alightings z
      ON z.trip_id = c.trip_id
     AND z.stop_sequence > c.stop_sequence
     AND z.arr_time > c.dep_time
    WHERE f.transfer_arrival_time > f.dep_time
)
SELECT *
FROM (
    SELECT * FROM direct_journeys
    UNION ALL
    SELECT * FROM transfer_journeys
) journeys
WHERE arrival_time <= p_now + INTERVAL '36 hours'
ORDER BY arrival_time, transfer_count, departure_time
LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.get_drt_journeys(
    text, text, integer, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_drt_journeys(
    text, text, integer, timestamptz
) TO authenticated;
