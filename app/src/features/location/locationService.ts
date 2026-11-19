import * as Location from 'expo-location';

export type MapLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

export async function getCurrentLocation(): Promise<MapLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
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

    if (place) {
      label = [
        place.streetNumber,
        place.street,
        place.city,
      ]
        .filter(Boolean)
        .join(' ') || 'Current location';
    }
  } catch {
    // GPS coordinates still work if reverse geocoding fails.
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    label,
  };
}
