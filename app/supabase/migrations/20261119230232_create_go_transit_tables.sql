
-- GO Transit routes (bus and train)
CREATE TABLE public.go_routes (
    route_id TEXT PRIMARY KEY,
    route_short_name TEXT,
    route_long_name TEXT,
    route_type INTEGER NOT NULL
        CHECK (route_type IN (2, 3))
);

-- GO Transit service dates
CREATE TABLE public.go_service_dates (
    service_id TEXT NOT NULL,
    service_date DATE NOT NULL,
    PRIMARY KEY (service_id, service_date)
);

-- Individual GO Transit trips
CREATE TABLE public.go_trips (
    trip_id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL
        REFERENCES public.go_routes(route_id),
    service_id TEXT NOT NULL,
    trip_headsign TEXT
);

-- Scheduled stop arrivals and departures
CREATE TABLE public.go_stop_times (
    trip_id TEXT NOT NULL
        REFERENCES public.go_trips(trip_id),
    stop_id TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    arrival_seconds INTEGER NOT NULL,
    departure_seconds INTEGER NOT NULL,
    pickup_type INTEGER,
    drop_off_type INTEGER,
    PRIMARY KEY (trip_id, stop_sequence)
);

-- Indexes for efficient schedule lookups
CREATE INDEX go_stop_times_stop_departure_idx
    ON public.go_stop_times(stop_id, departure_seconds);

CREATE INDEX go_trips_service_id_idx
    ON public.go_trips(service_id);

CREATE INDEX go_service_dates_date_idx
    ON public.go_service_dates(service_date);

-- Enable Row Level Security
ALTER TABLE public.go_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_service_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_stop_times ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read public transit schedules
CREATE POLICY "Authenticated users can read GO routes"
    ON public.go_routes FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Authenticated users can read GO service dates"
    ON public.go_service_dates FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Authenticated users can read GO trips"
    ON public.go_trips FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Authenticated users can read GO stop times"
    ON public.go_stop_times FOR SELECT
    TO authenticated USING (true);
