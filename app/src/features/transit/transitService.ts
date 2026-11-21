import type { MapLocation } from '../location/locationService';
import type { TransitStop } from './transitTypes';

import drtStops from './data/drt-stops.json';
import goStopsData from './data/go-stops.json';

const EARTH_RADIUS_METERS = 6371000;


//calulation done by Haversine formula
function calculateDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const latDifference =
    ((latitude2 - latitude1) * Math.PI) / 180;

  const lonDifference =
    ((longitude2 - longitude1) * Math.PI) / 180;

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos((latitude1 * Math.PI) / 180) *
    Math.cos((latitude2 * Math.PI) / 180) *
    Math.sin(lonDifference / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.min(1, Math.sqrt(a)))
  );
}


export function getNearbyStops(
  location: MapLocation,
  radiusMeters = 1000,
  limit = 10
): TransitStop[] {
  const allStops = [
    ...drtStops.map((stop) => ({
      ...stop,
      agency: 'DRT' as const,
      transitType: 'bus' as const,
    })),
    ...goStopsData.map((stop) => ({
      ...stop,
      agency: 'GO' as const,
      transitType: stop.transitType as 'bus' | 'train' | 'both',
    })),
  ];
  return allStops
    .map((stop) => ({
      ...stop,
      distanceMeters: calculateDistance(
        location.latitude,
        location.longitude,
        stop.latitude,
        stop.longitude
      ),
    }))
    .filter((stop) => stop.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

export function getNearbyDrtStops(
  location: MapLocation,
  radiusMeters = 1000,
  limit = 10
): TransitStop[] {
  return getNearbyStops(location, radiusMeters, 1000)
    .filter((stop) => stop.agency === 'DRT')
    .slice(0, limit);
}

export function getNearbyGoStops(
  location: MapLocation,
  radiusMeters = 5000,
  limit = 10
): TransitStop[] {
  return getNearbyStops(location, radiusMeters, 1000)
    .filter((stop) => stop.agency === 'GO')
    .slice(0, limit);
}