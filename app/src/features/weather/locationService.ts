import * as Location from 'expo-location';

export type WeatherLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

// Fallback if location permission is denied or unavailable.
const FALLBACK_LOCATION: WeatherLocation = {
  latitude: 43.6532,
  longitude: -79.3832,
  label: 'Toronto (fallback)',
};


export async function getWeatherLocation(
  allowFallback = true,
): Promise<WeatherLocation> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      if (allowFallback) return FALLBACK_LOCATION;
      throw new Error('Location permission was denied.');
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    let label = 'Current location';

    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const place = places[0];

      label =
        place?.city ??
        place?.subregion ??
        place?.region ??
        'Current location';
    } catch {
      // Reverse geocoding is optional.
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label,
    };
  } catch (error) {
    if (allowFallback) return FALLBACK_LOCATION;
    throw error;
  }
}
