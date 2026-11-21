import { supabase } from '../../../lib/supabase';

export type DrtRoute = {
  firstTripId: string;
  firstRoute: string;
  firstHeadsign: string | null;
  boardingStopId: string;
  transferStopId: string | null;
  secondTripId: string | null;
  secondRoute: string | null;
  secondHeadsign: string | null;
  alightingStopId: string;
  departureTime: string;
  transferArrivalTime: string | null;
  transferDepartureTime: string | null;
  arrivalTime: string;
  transferCount: number;
  durationMinutes: number;
};

type DrtRouteRow = {
  first_trip_id: string;
  first_route: string;
  first_headsign: string | null;
  boarding_stop_id: string;
  transfer_stop_id: string | null;
  second_trip_id: string | null;
  second_route: string | null;
  second_headsign: string | null;
  alighting_stop_id: string;
  departure_time: string;
  transfer_arrival_time: string | null;
  transfer_departure_time: string | null;
  arrival_time: string;
  transfer_count: number;
};

export async function getDrtRoutes(
  originStopId: string,
  destinationStopId: string,
  limit = 5
): Promise<DrtRoute[]> {
  const { data, error } = await supabase.rpc('get_drt_journeys', {
    p_origin_stop_id: originStopId,
    p_destination_stop_id: destinationStopId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`DRT route lookup failed: ${error.message}`);
  }

  return ((data ?? []) as DrtRouteRow[]).map((row) => {
    const durationMinutes = Math.ceil(
      (new Date(row.arrival_time).getTime() -
        new Date(row.departure_time).getTime()) /
        60000
    );

    return {
      firstTripId: row.first_trip_id,
      firstRoute: row.first_route,
      firstHeadsign: row.first_headsign,
      boardingStopId: row.boarding_stop_id,
      transferStopId: row.transfer_stop_id,
      secondTripId: row.second_trip_id,
      secondRoute: row.second_route,
      secondHeadsign: row.second_headsign,
      alightingStopId: row.alighting_stop_id,
      departureTime: row.departure_time,
      transferArrivalTime: row.transfer_arrival_time,
      transferDepartureTime: row.transfer_departure_time,
      arrivalTime: row.arrival_time,
      transferCount: row.transfer_count,
      durationMinutes,
    };
  });
}
