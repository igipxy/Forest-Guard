import { WeatherData } from '@fire-monitoring/shared';
import { SystemLogger } from '@/lib/logger';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { NotificationService } from './notification.service';

function parseFiniteNumberOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
}

export class BmkgWeatherService {
  private readonly baseUrl =
    process.env.BMKG_API_BASE_URL || 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
  private readonly defaultAdm4 = process.env.BMKG_DEFAULT_ADM4 || '35.73.01.1001';
  private readonly notificationService = new NotificationService();

  async fetchLatestWeather(adm4Code: string = this.defaultAdm4): Promise<WeatherData> {
    const endpoint = `${this.baseUrl}?adm4=${encodeURIComponent(adm4Code)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`BMKG API returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const currentSlot = payload?.data?.[0]?.cuaca?.[0]?.[0];
      const locationInfo = payload?.lokasi;

      if (!currentSlot || typeof currentSlot !== 'object') {
        throw new Error('Invalid BMKG response structure: missing data[0].cuaca[0][0]');
      }

      const temperatureC = parseFiniteNumberOrNull(currentSlot.t);
      const humidityPct = parseFiniteNumberOrNull(currentSlot.hu);
      const windSpeedKmh = parseFiniteNumberOrNull(currentSlot.ws);
      const precipitationMm = parseFiniteNumberOrNull(currentSlot.tp) ?? 0.0;

      // Never invent values if BMKG does not supply p, uv, or sr
      const pressureHpa = parseFiniteNumberOrNull(currentSlot.p);
      const uvIndex = parseFiniteNumberOrNull(currentSlot.uv);
      const solarRadiationWm2 = parseFiniteNumberOrNull(currentSlot.sr);

      const lastRainfallAt =
        precipitationMm > 0.5
          ? new Date().toISOString()
          : await this.getLastRecordedRainfallDate(adm4Code);

      const record: Omit<WeatherData, 'id'> = {
        stationId: adm4Code,
        locationName: locationInfo?.desa
          ? `${locationInfo.desa}, ${locationInfo.kotkab}`
          : `BMKG Station ${adm4Code}`,
        temperatureC,
        windSpeedKmh,
        pressureHpa,
        uvIndex,
        solarRadiationWm2,
        precipitationMm,
        lastRainfallAt,
        humidityPct,
        recordedAt: currentSlot.local_datetime
          ? new Date(currentSlot.local_datetime).toISOString()
          : new Date().toISOString(),
        syncedAt: new Date().toISOString(),
        isFallback: false,
        dataSource: 'BMKG_LIVE',
      };

      return await this.persistWeatherRecord(record);
    } catch (error) {
      clearTimeout(timeout);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown BMKG synchronization failure';

      await SystemLogger.log({
        level: 'ERROR',
        httpStatus: 502,
        errorCategory: 'BMKG_API_ERROR',
        message: `BMKG synchronization failed for ${adm4Code}: ${errorMessage}`,
        requestEndpoint: endpoint,
        requestMethod: 'GET',
        sourceService: 'BmkgWeatherService',
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      await this.notificationService.createOrDeduplicateAlert({
        dedupKey: `BMKG_SYNC_FAIL:${adm4Code}`,
        title: `BMKG Weather Synchronization Failed (${adm4Code})`,
        severity: 'WARNING',
        category: 'SYSTEM_SYNC',
        description: `Unable to retrieve live BMKG telemetry (${errorMessage}). Operating on cached or unavailable fallback state.`,
        location: adm4Code,
      });

      return await this.getCachedOrUnavailableWeather(adm4Code);
    }
  }

  private async getLastRecordedRainfallDate(adm4Code: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from('weather_records')
        .select('recorded_at')
        .eq('station_id', adm4Code)
        .gt('precipitation_mm', 0.5)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      return data?.recorded_at ?? null;
    } catch {
      return null;
    }
  }

  private async persistWeatherRecord(record: Omit<WeatherData, 'id'>): Promise<WeatherData> {
    if (!isSupabaseConfigured()) {
      return { ...record, id: `mem-${Date.now()}` };
    }
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('weather_records')
        .insert({
          station_id: record.stationId,
          location_name: record.locationName,
          temperature_c: record.temperatureC,
          wind_speed_kmh: record.windSpeedKmh,
          pressure_hpa: record.pressureHpa,
          uv_index: record.uvIndex,
          solar_radiation_wm2: record.solarRadiationWm2,
          precipitation_mm: record.precipitationMm ?? 0,
          last_rainfall_at: record.lastRainfallAt,
          humidity_pct: record.humidityPct,
          recorded_at: record.recordedAt,
          synced_at: record.syncedAt,
          is_fallback: record.isFallback,
          data_source: record.dataSource,
        })
        .select('id')
        .single();

      if (error || !data) throw error;
      return { ...record, id: data.id };
    } catch {
      return { ...record, id: `local-${Date.now()}` };
    }
  }

  private async getCachedOrUnavailableWeather(adm4Code: string): Promise<WeatherData> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getServiceSupabase();
        const { data } = await supabase
          .from('weather_records')
          .select('*')
          .eq('station_id', adm4Code)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          return {
            id: data.id,
            stationId: data.station_id,
            locationName: data.location_name,
            temperatureC: parseFiniteNumberOrNull(data.temperature_c),
            windSpeedKmh: parseFiniteNumberOrNull(data.wind_speed_kmh),
            pressureHpa: parseFiniteNumberOrNull(data.pressure_hpa),
            uvIndex: parseFiniteNumberOrNull(data.uv_index),
            solarRadiationWm2: parseFiniteNumberOrNull(data.solar_radiation_wm2),
            precipitationMm: parseFiniteNumberOrNull(data.precipitation_mm),
            lastRainfallAt: data.last_rainfall_at,
            humidityPct: parseFiniteNumberOrNull(data.humidity_pct),
            recordedAt: data.recorded_at,
            syncedAt: data.synced_at,
            isFallback: true,
            dataSource: 'CACHED_FALLBACK',
          };
        }
      } catch {
        // Fall through to DATA_UNAVAILABLE
      }
    }

    // Never fabricate measurements when both BMKG and cache are unavailable
    return {
      id: `unavailable-${Date.now()}`,
      stationId: adm4Code,
      locationName: `Station ${adm4Code} (Telemetry Unavailable)`,
      temperatureC: null,
      windSpeedKmh: null,
      pressureHpa: null,
      uvIndex: null,
      solarRadiationWm2: null,
      precipitationMm: null,
      lastRainfallAt: null,
      humidityPct: null,
      recordedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      isFallback: true,
      dataSource: 'DATA_UNAVAILABLE',
    };
  }
}