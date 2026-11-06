import {
  classifyFireRiskScore,
  DailyFireRiskReport,
  WeatherData,
} from '@fire-monitoring/shared';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { RuleBasedFireRiskModel } from './fire-risk.service';

export class ReportService {
  private readonly riskModel = new RuleBasedFireRiskModel();

  /**
   * Generates a daily fire risk report strictly bounded to the requested YYYY-MM-DD date.
   * Never substitutes current weather for a past date.
   */
  async generateReportForDate(
    reportDate: string,
    explicitPeriodRecords?: WeatherData[]
  ): Promise<DailyFireRiskReport> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      throw new Error(`Invalid reportDate "${reportDate}". Expected YYYY-MM-DD.`);
    }

    const startIso = `${reportDate}T00:00:00.000Z`;
    const endIso = `${reportDate}T23:59:59.999Z`;

    let periodRecords: WeatherData[] = [];

    if (explicitPeriodRecords) {
      periodRecords = explicitPeriodRecords.filter(
        (r) => r.recordedAt >= startIso && r.recordedAt <= endIso
      );
    } else if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from('weather_records')
        .select('*')
        .gte('recorded_at', startIso)
        .lte('recorded_at', endIso)
        .order('recorded_at', { ascending: true });

      if (data) {
        periodRecords = data.map((row) => ({
          id: row.id,
          stationId: row.station_id,
          locationName: row.location_name,
          temperatureC: row.temperature_c !== null ? Number(row.temperature_c) : null,
          windSpeedKmh: row.wind_speed_kmh !== null ? Number(row.wind_speed_kmh) : null,
          pressureHpa: row.pressure_hpa !== null ? Number(row.pressure_hpa) : null,
          uvIndex: row.uv_index !== null ? Number(row.uv_index) : null,
          solarRadiationWm2:
            row.solar_radiation_wm2 !== null ? Number(row.solar_radiation_wm2) : null,
          precipitationMm:
            row.precipitation_mm !== null ? Number(row.precipitation_mm) : null,
          lastRainfallAt: row.last_rainfall_at,
          humidityPct: row.humidity_pct !== null ? Number(row.humidity_pct) : null,
          recordedAt: row.recorded_at,
          syncedAt: row.synced_at,
          isFallback: Boolean(row.is_fallback),
          dataSource: row.data_source,
        }));
      }
    }

    if (periodRecords.length === 0) {
      throw new Error(
        `No historical weather records found for reporting period ${reportDate}. Refusing to substitute current weather.`
      );
    }

    const validTemps = periodRecords
      .map((r) => r.temperatureC)
      .filter((v): v is number => v !== null);
    const validWinds = periodRecords
      .map((r) => r.windSpeedKmh)
      .filter((v): v is number => v !== null);
    const validRains = periodRecords
      .map((r) => r.precipitationMm)
      .filter((v): v is number => v !== null);
    const validHums = periodRecords
      .map((r) => r.humidityPct)
      .filter((v): v is number => v !== null);

    const maxTemperatureC = validTemps.length ? Math.max(...validTemps) : null;
    const avgWindSpeedKmh = validWinds.length
      ? Number((validWinds.reduce((a, b) => a + b, 0) / validWinds.length).toFixed(1))
      : null;
    const totalPrecipitationMm = validRains.length
      ? Number(validRains.reduce((a, b) => a + b, 0).toFixed(1))
      : null;
    const avgHumidityPct = validHums.length
      ? Number((validHums.reduce((a, b) => a + b, 0) / validHums.length).toFixed(1))
      : null;

    // Evaluate risk across every record in the date window to find the peak risk and time window
    let peakScore = 0;
    let peakRecord = periodRecords[0]!;

    for (const rec of periodRecords) {
      const evaluated = this.riskModel.evaluate(rec);
      if (evaluated.riskScore >= peakScore) {
        peakScore = evaluated.riskScore;
        peakRecord = rec;
      }
    }

    const peakEval = this.riskModel.evaluate(peakRecord);
    const peakHour = new Date(peakRecord.recordedAt).getUTCHours();
    const highestRiskPeriod = `${String((peakHour + 7) % 24).padStart(2, '0')}:00 WIB`;

    return {
      id: `rep-${reportDate}`,
      reportDate,
      maxTemperatureC,
      avgWindSpeedKmh,
      totalPrecipitationMm,
      avgHumidityPct,
      lastRainfallAt: periodRecords[periodRecords.length - 1]?.lastRainfallAt ?? null,
      dailyRiskScore: peakScore,
      riskClassification: classifyFireRiskScore(peakScore),
      highestRiskPeriod,
      vulnerableAreas: peakEval.vulnerableAreas,
      riskFactorAnalysis: `Aggregated from ${periodRecords.length} historical telemetry records on ${reportDate}. Peak temperature: ${
        maxTemperatureC !== null ? `${maxTemperatureC.toFixed(1)}°C` : 'Unavailable'
      }, average humidity: ${
        avgHumidityPct !== null ? `${avgHumidityPct.toFixed(1)}%` : 'Unavailable'
      }, peak susceptibility score: ${peakScore}/100 (${peakEval.classification}).`,
      recommendedActions:
        peakScore >= 61
          ? [
              'Maintain heightened camera surveillance on vulnerable sectors.',
              'Verify field relay battery levels and HLS stream continuity.',
              'Alert ground forestry response units during peak risk window.',
            ]
          : ['Continue standard scheduled BMKG telemetry and camera health checks.'],
      recordCount: periodRecords.length,
      generatedAt: new Date().toISOString(),
    };
  }
}