import { supabase } from '../../../lib/supabase';

export type GoDirectRoute = {
  tripId: string;
  route: string;
  transitType: 'bus' | 'train';
  destination: string;
  boardingStopId: string;
  alightingStopId: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  durationMinutes: number;
};

type GoDirectRouteRow = {
  trip_id: string;
  route: string;
  transit_type: 'bus' | 'train';
  destination: string;
  boarding_stop_id: string;
  alighting_stop_id: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  duration_minutes: number;
};

export async function getGoDirectRoutes(
  originStopId: string,
  destinationStopId: string,
  limit = 5
): Promise<GoDirectRoute[]> {
  const { data, error } = await supabase.rpc('get_go_direct_routes', {
    p_origin_stop_id: originStopId,
    p_destination_stop_id: destinationStopId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`GO route lookup failed: ${error.message}`);
  }

  return ((data ?? []) as GoDirectRouteRow[]).map((row) => ({
    tripId: row.trip_id,
    route: row.route,
    transitType: row.transit_type,
    destination: row.destination,
    boardingStopId: row.boarding_stop_id,
    alightingStopId: row.alighting_stop_id,
    scheduledDeparture: row.scheduled_departure,
    scheduledArrival: row.scheduled_arrival,
    durationMinutes: row.duration_minutes,
  }));
}