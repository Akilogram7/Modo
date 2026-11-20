import { supabase } from '../../../lib/supabase';
import type { MapLocation } from './locationService';

type GeocodingFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    label?: string;
    name?: string;
  };
};

type GeocodingResponse = {
  features: GeocodingFeature[];
};

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<MapLocation[]> {
  const search = query.trim();

  if (search.length < 3) return [];

  const { data, error } =
    await supabase.functions.invoke<GeocodingResponse>(
      'search-addresses',
      {
        body: { query: search },
        signal,
      },
    );

  if (error) {
    throw new Error(
      `Address search failed: ${error.message}`,
    );
  }

  if (!data || !Array.isArray(data.features)) {
    throw new Error('Invalid address search response');
  }

  return data.features.map((feature) => ({
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    label:
      feature.properties.label ??
      feature.properties.name ??
      'Unknown location',
  }));
}
