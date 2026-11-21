CREATE INDEX IF NOT EXISTS drt_stop_times_trip_sequence_idx
ON public.drt_stop_times (trip_id, stop_sequence)
INCLUDE (
    stop_id,
    arrival_seconds,
    departure_seconds,
    pickup_type,
    drop_off_type
);

CREATE INDEX IF NOT EXISTS drt_stop_times_stop_trip_idx
ON public.drt_stop_times (stop_id, trip_id, stop_sequence);