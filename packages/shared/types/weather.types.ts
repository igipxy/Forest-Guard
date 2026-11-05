export type WeatherDataSource = 'BMKG_LIVE' | 'CACHED_FALLBACK' | 'DEMO_SIMULATION';

export interface WeatherData {
  id: string;
  stationId: string;
  locationName: string;
  temperatureC: number;
  windSpeedKmh: number;
  pressureHpa: number;
  uvIndex: number;
  solarRadiationWm2: number;
  precipitationMm: number;
  lastRainfallAt: string | null;
  humidityPct: number;
  recordedAt: string;
  syncedAt: string;
  isFallback: boolean;
  dataSource: WeatherDataSource;
}

export type WeatherTimeRange = 'DAILY' | 'WEEKLY' | 'MONTHLY';