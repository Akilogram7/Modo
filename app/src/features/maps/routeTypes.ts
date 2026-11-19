export type TravelMode = 'driving' | 'walking';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: RouteCoordinate[];
  steps: RouteStep[];
};
