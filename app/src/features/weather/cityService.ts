
export type CityResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

export async function searchCities(query: string): Promise<CityResult[]> {
  const search = query.trim();

  if (search.length < 2) return [];

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=10&language=en&format=json`,
  );

  if (!response.ok) {
    throw new Error(`City search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.results ?? []).map((city: CityResult) => ({
    id: city.id,
    name: city.name,
    country: city.country,
    admin1: city.admin1,
    latitude: city.latitude,
    longitude: city.longitude,
  }));
}
