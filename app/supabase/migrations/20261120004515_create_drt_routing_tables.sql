-- DRT routes
CREATE TABLE public.drt_routes (
    route_id text PRIMARY KEY,
    route_short_name text NOT NULL,
    route_long_name text,
    route_type integer NOT NULL DEFAULT 3
);

-- Individual scheduled DRT trips
CREATE TABLE public.drt_trips (
    trip_id text PRIMARY KEY,
    route_id text NOT NULL
        REFERENCES public.drt_routes(route_id),
    service_id text NOT NULL,
    trip_headsign text,
    direction_id integer
);

-- Ordered stops visited by each trip
CREATE TABLE public.drt_stop_times (
    trip_id text NOT NULL
        REFERENCES public.drt_trips(trip_id),
    stop_sequence integer NOT NULL,
    stop_id text NOT NULL,
    arrival_seconds integer NOT NULL,
    departure_seconds integer NOT NULL,
    pickup_type integer NOT NULL DEFAULT 0,
    drop_off_type integer NOT NULL DEFAULT 0,

    PRIMARY KEY (trip_id, stop_sequence)
);

-- Dates on which DRT services operate
CREATE TABLE public.drt_service_dates (
    service_id text NOT NULL,
    service_date date NOT NULL,

    PRIMARY KEY (service_id, service_date)
);

-- Indexes for stop lookups and routing
CREATE INDEX drt_stop_times_stop_departure_idx
    ON public.drt_stop_times (stop_id, departure_seconds);

CREATE INDEX drt_trips_service_id_idx
    ON public.drt_trips (service_id);

CREATE INDEX drt_service_dates_date_idx
    ON public.drt_service_dates (service_date);

-- Enable Row Level Security
ALTER TABLE public.drt_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drt_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drt_stop_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drt_service_dates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read transit schedules
CREATE POLICY "Authenticated users can read DRT routes"
    ON public.drt_routes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read DRT trips"
    ON public.drt_trips
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read DRT stop times"
    ON public.drt_stop_times
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read DRT service dates"
    ON public.drt_service_dates
    FOR SELECT TO authenticated
    USING (true);

-- No client-side schedule modifications
REVOKE ALL ON TABLE
    public.drt_routes,
    public.drt_trips,
    public.drt_stop_times,
    public.drt_service_dates
FROM anon;

GRANT SELECT ON TABLE
    public.drt_routes,
    public.drt_trips,
    public.drt_stop_times,
    public.drt_service_dates
TO authenticated;