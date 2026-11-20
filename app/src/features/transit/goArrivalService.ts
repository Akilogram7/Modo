import { supabase } from '../../../lib/supabase';

export type GoArrival = {
  tripId: string;
  route: string;
  transitType: 'bus' | 'train';
  destination: string;
  arrivalTime: string;
  minutesUntilArrival: number;
};

type GoDepartureRow = {
  trip_id: string;
  route: string;
  transit_type: 'bus' | 'train';
  destination: string;
  scheduled_departure: string;
  minutes_until: number;
};

const torontoTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export async function getGoUpcomingArrivals(
  stopId: string,
  limit = 5
): Promise<GoArrival[]> {
  const { data, error } = await supabase.rpc(
    'get_go_departures',
    {
      p_stop_id: stopId,
      p_limit: limit,
    }
  );

  if (error) {
    throw new Error(`GO Transit schedule lookup failed: ${error.message}`);
  }

  const rows = (data ?? []) as GoDepartureRow[];

  return rows.map((row) => ({
    tripId: row.trip_id,
    route: row.route,
    transitType: row.transit_type,
    destination: row.destination,
    arrivalTime: torontoTimeFormatter.format(
      new Date(row.scheduled_departure)
    ),
    minutesUntilArrival: row.minutes_until,
  }));
}
