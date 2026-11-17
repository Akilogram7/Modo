import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeatherLocation } from './locationService';

const WEATHER_LOCATION_KEY = '@modo/weather-location';

export async function saveWeatherLocation(
  location: WeatherLocation,
): Promise<void> {
  await AsyncStorage.setItem(
    WEATHER_LOCATION_KEY,
    JSON.stringify(location),
  );
}

export async function loadWeatherLocation(): Promise<WeatherLocation | null> {
  const stored = await AsyncStorage.getItem(WEATHER_LOCATION_KEY);

  if (!stored) return null;

  try {
    const location: WeatherLocation = JSON.parse(stored);

    if (
      typeof location.latitude !== 'number' ||
      !Number.isFinite(location.latitude) ||
      typeof location.longitude !== 'number' ||
      !Number.isFinite(location.longitude) ||
      typeof location.label !== 'string' ||
      Math.abs(location.latitude) > 90 ||
      Math.abs(location.longitude) > 180
    ) {
      return null;
    }

    return location;
  } catch {
    return null;
  }
}

export async function clearWeatherLocation(): Promise<void> {
  await AsyncStorage.removeItem(WEATHER_LOCATION_KEY);
}
