import type { MapLocation } from './locationService';

type PhotonFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type PhotonResponse = {
  features: PhotonFeature[];
};

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<MapLocation[]> {
  const search = query.trim();

  if (search.length < 3) return [];

  const params = new URLSearchParams({
    q: search,
    limit: '5',
    lang: 'en',
    lat: '43.9455',
    lon: '-78.8968',
  });

  const response = await fetch(
    `https://photon.komoot.io/api?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Photon search failed: ${response.status}`);
  }

  const data: PhotonResponse = await response.json();

  return data.features.map((feature) => {
    const p = feature.properties;

    const label = [
      p.name,
      [p.housenumber, p.street].filter(Boolean).join(' '),
      p.city,
      p.state,
      p.country,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1],
      label: label || 'Unknown location',
    };
  });
}
