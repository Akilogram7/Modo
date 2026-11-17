export type WeatherData = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
};

export type WeatherCondition = {
  description: string;
  icon: string;
};