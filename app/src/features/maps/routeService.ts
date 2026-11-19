import { supabase } from '../../../lib/supabase';

import type { MapLocation } from '../location/locationService';
import type { RouteResult, TravelMode } from './routeTypes';

export async function getRoute(
  origin: MapLocation,
  destination: MapLocation,
  travelMode: TravelMode,
): Promise<RouteResult> {
  const { data, error } = await supabase.functions.invoke(
    'get-route',
    {
      body: {
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        travelMode,
      },
    },
  );

  
if (error) {
  console.error('Supabase route error:', error);

  let message = error.message;

  if ('context' in error && error.context instanceof Response) {
    const response = error.context;

    console.error('Route HTTP status:', response.status);

    try {
      const body = await response.json();

      console.error('Route response:', body);

      message = body.error ?? message;
    } catch {
      // Response may not contain JSON.
    }
  }

  throw new Error(message);
}


  return data as RouteResult;
}
