import type { MapLocation } from '../location/locationService';
import { getNearbyDrtStops } from './transitService';
import { getDrtRoutes, type DrtRoute } from './drtRouteService';
import type { TransitStop } from './transitTypes';

export type DrtJourney = {
  originStop: TransitStop;
  destinationStop: TransitStop;
  route: DrtRoute;
  walkingDistanceMeters: number;
};

export async function planDrtJourney(
  origin: MapLocation,
  destination: MapLocation
): Promise<DrtJourney[]> {
  const originStops = getNearbyDrtStops(origin, 1500, 8);
  const destinationStops = getNearbyDrtStops(destination, 1500, 8);

  console.log('DRT ROUTING DEBUG:', {
  origin: origin.label,
  destination: destination.label,
  originStops: originStops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    distance: Math.round(stop.distanceMeters ?? 0),
  })),
  destinationStops: destinationStops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    distance: Math.round(stop.distanceMeters ?? 0),
  })),
});

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

  const results: DrtJourney[] = [];

  // Process requests in batches to limit concurrent Supabase calls.
  for (let i = 0; i < stopPairs.length; i += 4) {
    const batch = stopPairs.slice(i, i + 4);

    const batchResults = await Promise.all(
      batch.map(async ({ originStop, destinationStop }) => {
        const routes = await getDrtRoutes(
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
    .sort((a, b) => {
      const arrivalDifference =
        new Date(a.route.arrivalTime).getTime() -
        new Date(b.route.arrivalTime).getTime();

      if (arrivalDifference !== 0) {
        return arrivalDifference;
      }

      return a.route.transferCount - b.route.transferCount;
    })
    .slice(0, 5);
}
