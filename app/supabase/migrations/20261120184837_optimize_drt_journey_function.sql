
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
WITH
service_days AS MATERIALIZED (
    SELECT service_id, service_date
    FROM public.drt_service_dates
    WHERE service_date BETWEEN
        (p_now AT TIME ZONE 'America/Toronto')::date - 1
        AND
        (p_now AT TIME ZONE 'America/Toronto')::date + 1
),

origin_departures AS MATERIALIZED (
    SELECT
        st.trip_id,
        st.stop_sequence,
        st.stop_id,
        t.route_id,
        r.route_short_name,
        t.trip_headsign,
        sd.service_date,
        (
            sd.service_date::timestamp
            + st.departure_seconds * INTERVAL '1 second'
        ) AT TIME ZONE 'America/Toronto' AS dep_time
    FROM public.drt_stop_times st
    JOIN public.drt_trips t
        ON t.trip_id = st.trip_id
    JOIN public.drt_routes r
        ON r.route_id = t.route_id
    JOIN service_days sd
        ON sd.service_id = t.service_id
    WHERE st.stop_id = p_origin_stop_id
      AND st.pickup_type = 0
      AND (
          sd.service_date::timestamp
          + st.departure_seconds * INTERVAL '1 second'
      ) AT TIME ZONE 'America/Toronto'
          BETWEEN p_now AND p_now + INTERVAL '6 hours'
),

first_legs AS MATERIALIZED (
    SELECT
        o.trip_id,
        o.route_id,
        o.stop_sequence AS boarding_sequence,
        o.stop_id AS boarding_stop_id,
        o.route_short_name,
        o.trip_headsign,
        o.dep_time,
        s.stop_id AS transfer_stop_id,
        (
            o.service_date::timestamp
            + s.arrival_seconds * INTERVAL '1 second'
        ) AT TIME ZONE 'America/Toronto' AS transfer_arrival_time
    FROM origin_departures o
    JOIN public.drt_stop_times s
        ON s.trip_id = o.trip_id
       AND s.stop_sequence > o.stop_sequence
       AND s.drop_off_type = 0
    WHERE s.stop_id <> o.stop_id
),

destination_arrivals AS MATERIALIZED (
    SELECT
        s.trip_id,
        s.stop_sequence,
        s.stop_id,
        sd.service_date,
        (
            sd.service_date::timestamp
            + s.arrival_seconds * INTERVAL '1 second'
        ) AT TIME ZONE 'America/Toronto' AS arr_time
    FROM public.drt_stop_times s
    JOIN public.drt_trips t
        ON t.trip_id = s.trip_id
    JOIN service_days sd
        ON sd.service_id = t.service_id
    WHERE s.stop_id = p_destination_stop_id
      AND s.drop_off_type = 0
),

direct_journeys AS (
    SELECT
        o.trip_id AS first_trip_id,
        o.route_short_name AS first_route,
        o.trip_headsign AS first_headsign,
        o.stop_id AS boarding_stop_id,
        NULL::text AS transfer_stop_id,
        NULL::text AS second_trip_id,
        NULL::text AS second_route,
        NULL::text AS second_headsign,
        d.stop_id AS alighting_stop_id,
        o.dep_time AS departure_time,
        NULL::timestamptz AS transfer_arrival_time,
        NULL::timestamptz AS transfer_departure_time,
        d.arr_time AS arrival_time,
        0 AS transfer_count
    FROM origin_departures o
    JOIN destination_arrivals d
        ON d.trip_id = o.trip_id
       AND d.service_date = o.service_date
       AND d.stop_sequence > o.stop_sequence
       AND d.arr_time > o.dep_time
),

transfer_candidates AS MATERIALIZED (
    SELECT
        s.trip_id,
        s.stop_id,
        s.stop_sequence,
        t.route_id,
        r.route_short_name,
        t.trip_headsign,
        sd.service_date,
        (
            sd.service_date::timestamp
            + s.departure_seconds * INTERVAL '1 second'
        ) AT TIME ZONE 'America/Toronto' AS dep_time
    FROM public.drt_stop_times s
    JOIN public.drt_trips t
        ON t.trip_id = s.trip_id
    JOIN public.drt_routes r
        ON r.route_id = t.route_id
    JOIN service_days sd
        ON sd.service_id = t.service_id
    WHERE s.pickup_type = 0
      AND EXISTS (
          SELECT 1
          FROM first_legs f
          WHERE f.transfer_stop_id = s.stop_id
      )
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
        d.stop_id AS alighting_stop_id,
        f.dep_time AS departure_time,
        f.transfer_arrival_time,
        c.dep_time AS transfer_departure_time,
        d.arr_time AS arrival_time,
        1 AS transfer_count
    FROM first_legs f
   JOIN transfer_candidates c
    ON c.stop_id = f.transfer_stop_id
   AND c.trip_id <> f.trip_id
   AND c.route_id <> f.route_id
       AND c.dep_time >=
           f.transfer_arrival_time + INTERVAL '5 minutes'
       AND c.dep_time <=
           f.transfer_arrival_time + INTERVAL '90 minutes'
    JOIN destination_arrivals d
        ON d.trip_id = c.trip_id
       AND d.service_date = c.service_date
       AND d.stop_sequence > c.stop_sequence
       AND d.arr_time > c.dep_time
    WHERE f.transfer_arrival_time > f.dep_time
)

SELECT *
FROM (
    SELECT * FROM direct_journeys
    UNION ALL
    SELECT * FROM transfer_journeys
) journeys
WHERE arrival_time <= p_now + INTERVAL '24 hours'
ORDER BY arrival_time, transfer_count, departure_time
LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.get_drt_journeys(
    text, text, integer, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_drt_journeys(
    text, text, integer, timestamptz
) TO authenticated;
