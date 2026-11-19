// Shared data shape for modes created by the user.
// timerDuration is stored in SECONDS, matching CreateModeScreen.
import type { MapLocation } from '../features/location/locationService';
import type { TravelMode } from '../features/maps/routeTypes';

export type CustomModeInput = {
  name: string;
  color: string;
  character: number | null;

  timerEnabled: boolean;
  timerDuration: number | null;

  musicEnabled: boolean;
  playlistUrl: string | null;
  playlistName: string | null;

  weatherEnabled: boolean;

  // Maps
  mapEnabled: boolean;
  mapDestination: MapLocation | null;
  mapTravelMode: TravelMode;
};

export type CustomMode = CustomModeInput & { id: string };
