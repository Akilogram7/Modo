import type { WeatherData, WeatherCondition } from './weatherTypes';

export async function getWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'is_day',
    ].join(','),
    hourly: 'precipitation_probability',
    forecast_days: '1',
    timezone: 'auto',
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  const current = data.current;

  if (!current) {
    throw new Error('Weather data unavailable');
  }

  // Match the current observation to the nearest forecast hour.
  const hours: string[] = data.hourly?.time ?? [];
  const currentHour = current.time?.slice(0, 13);

  const hourIndex = hours.findIndex(
    (time) => time.slice(0, 13) === currentHour,
  );

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    precipitationProbability:
      hourIndex >= 0
        ? (data.hourly.precipitation_probability[hourIndex] ?? 0)
        : 0,
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    isDay: current.is_day === 1,
  };
}

//code to get the specific weather condition 
export function getWeatherCondition(code: number): WeatherCondition {
  if (code === 0) return { description: 'Clear sky', icon: 'sunny' };
  if (code <= 3) return { description: 'Partly cloudy', icon: 'partly-sunny' };
  if (code <= 48) return { description: 'Foggy', icon: 'cloudy' };
  if (code <= 57) return { description: 'Drizzle', icon: 'rainy' };
  if (code <= 67) return { description: 'Rainy', icon: 'rainy' };
  if (code <= 77) return { description: 'Snowy', icon: 'snow' };
  if (code <= 82) return { description: 'Rain showers', icon: 'rainy' };
  if (code <= 86) return { description: 'Snow showers', icon: 'snow' };
  if (code <= 99) return { description: 'Thunderstorms', icon: 'thunderstorm' };

  return { description: 'Unknown', icon: 'cloud' };
}