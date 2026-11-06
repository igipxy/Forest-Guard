export type WeatherDataSource =
  | 'BMKG_LIVE'
  | 'CACHED_FALLBACK'
  | 'DEMO_SIMULATION'
  | 'DATA_UNAVAILABLE';

export interface WeatherData {
  id: string;
  stationId: string;
  locationName: string;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  pressureHpa: number | null; // Nullable when BMKG endpoint omits atmospheric pressure
  uvIndex: number | null; // Nullable when BMKG endpoint omits UV index
  solarRadiationWm2: number | null; // Nullable when BMKG endpoint omits solar radiation
  precipitationMm: number | null;
  lastRainfallAt: string | null;
  humidityPct: number | null;
  recordedAt: string;
  syncedAt: string;
  isFallback: boolean;
  dataSource: WeatherDataSource;
}

export type WeatherTimeRange = 'DAILY' | 'WEEKLY' | 'MONTHLY';