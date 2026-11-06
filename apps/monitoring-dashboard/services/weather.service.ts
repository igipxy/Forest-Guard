import { WeatherData, WeatherTimeRange } from '@fire-monitoring/shared';
import { BmkgWeatherService } from './bmkg.service';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';

export class WeatherService {
  private readonly bmkgService = new BmkgWeatherService();

  async getLatestWeather(adm4Code?: string): Promise<WeatherData> {
    return this.bmkgService.fetchLatestWeather(adm4Code);
  }

  async getHistoricalWeather(range: WeatherTimeRange = 'DAILY'): Promise<WeatherData[]> {
    const pointsCount = range === 'DAILY' ? 8 : range === 'WEEKLY' ? 7 : 15;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
          .from('weather_records')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(pointsCount);

        if (!error && data && data.length > 0) {
          return data.reverse().map((row) => ({
            id: row.id,
            stationId: row.station_id,
            locationName: row.location_name,
            temperatureC: Number(row.temperature_c),
            windSpeedKmh: Number(row.wind_speed_kmh),
            pressureHpa: Number(row.pressure_hpa),
            uvIndex: Number(row.uv_index),
            solarRadiationWm2: Number(row.solar_radiation_wm2),
            precipitationMm: Number(row.precipitation_mm),
            lastRainfallAt: row.last_rainfall_at,
            humidityPct: Number(row.humidity_pct),
            recordedAt: row.recorded_at,
            syncedAt: row.synced_at,
            isFallback: Boolean(row.is_fallback),
            dataSource: row.data_source || (row.is_fallback ? 'CACHED_FALLBACK' : 'BMKG_LIVE'),
          }));
        }
      } catch {
        // Fall through to clearly labeled demo historical series
      }
    }

    const now = Date.now();
    const stepMs = range === 'DAILY' ? 3 * 3600000 : 24 * 3600000;

    return Array.from({ length: pointsCount }, (_, idx) => {
      const ts = new Date(now - (pointsCount - 1 - idx) * stepMs).toISOString();
      const wave = Math.sin((idx / pointsCount) * Math.PI);
      return {
        id: `demo-hist-${idx}`,
        stationId: '35.73.01.1001',
        locationName: 'Malang Highland (Demo Historical Series)',
        temperatureC: Number((26.5 + wave * 7.8).toFixed(1)),
        windSpeedKmh: Number((14.0 + wave * 14.5).toFixed(1)),
        pressureHpa: Number((1011.0 - wave * 3.5).toFixed(1)),
        uvIndex: Number(Math.max(1, wave * 9.5).toFixed(1)),
        solarRadiationWm2: Number(Math.max(80, wave * 820).toFixed(0)),
        precipitationMm: idx === 2 ? 4.2 : 0.0,
        lastRainfallAt: new Date(now - 5 * 86400000).toISOString(),
        humidityPct: Number((68.0 - wave * 36.0).toFixed(1)),
        recordedAt: ts,
        syncedAt: ts,
        isFallback: true,
        dataSource: 'DEMO_SIMULATION',
      };
    });
  }
}