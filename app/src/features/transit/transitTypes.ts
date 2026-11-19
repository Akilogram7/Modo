export type TransitAgency = 'DRT' | 'GO';

export type TransitStop = {
  id: string;
  code?: string;
  name: string;
  latitude: number;
  longitude: number;
  agency: TransitAgency;
  distanceMeters?: number;
};

export type BusArrival = {
  stopId: string;
  routeId: string;
  routeName: string;
  destination: string;
  arrivalTime: string;
  isRealtime: boolean;
  delaySeconds?: number;
};

export type TransitRoute = {
  id: string;
  name: string;
  agency: TransitAgency;
  destination?: string;
};
