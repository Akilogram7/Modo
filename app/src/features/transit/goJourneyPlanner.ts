import type { MapLocation } from '../location/locationService';
import { getNearbyGoStops } from './transitService';
import { getGoDirectRoutes, type GoDirectRoute } from './goRouteService';
import type { TransitStop } from './transitTypes';

export type GoJourney = {
  originStop: TransitStop;
  destinationStop: TransitStop;
  route: GoDirectRoute;
  walkingDistanceMeters: number;
};

export async function planGoJourney(
  origin: MapLocation,
  destination: MapLocation
): Promise<GoJourney[]> {
  const originStops = getNearbyGoStops(origin, 3000, 5);
  const destinationStops = getNearbyGoStops(destination, 3000, 5);

  if (originStops.length === 0 || destinationStops.length === 0) {
    return [];
  }

  const stopPairs = originStops.flatMap((originStop) =>
    destinationStops
      .filter((destinationStop) => destinationStop.id !== originStop.id)
      .map((destinationStop) => ({
        originStop,
        destinationStop,
      }))
  );

  const results: GoJourney[] = [];

  // Limit concurrent requests to avoid overwhelming Supabase.
  for (let i = 0; i < stopPairs.length; i += 5) {
    const batch = stopPairs.slice(i, i + 5);

    const batchResults = await Promise.all(
      batch.map(async ({ originStop, destinationStop }) => {
        const routes = await getGoDirectRoutes(
          originStop.id,
          destinationStop.id,
          3
        );

        return routes.map((route) => ({
          originStop,
          destinationStop,
          route,
          walkingDistanceMeters:
            (originStop.distanceMeters ?? 0) +
            (destinationStop.distanceMeters ?? 0),
        }));
      })
    );

    results.push(...batchResults.flat());
  }

  return results
    .sort(
      (a, b) =>
        new Date(a.route.scheduledArrival).getTime() -
        new Date(b.route.scheduledArrival).getTime()
    )
    .slice(0, 5);
}