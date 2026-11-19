import type { MapLocation } from '../location/locationService';
import type { TravelMode } from './routeTypes';

export type SavedMapSettings = {
  enabled: boolean;
  destination: MapLocation | null;
  travelMode: TravelMode;
};

export const EMPTY_MAP_SETTINGS: SavedMapSettings = {
  enabled: false,
  destination: null,
  travelMode: 'driving',
};
