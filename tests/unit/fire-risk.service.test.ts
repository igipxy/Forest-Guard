import { describe, it, expect } from 'vitest';
import { RuleBasedFireRiskModel } from '../../apps/monitoring-dashboard/services/fire-risk.service';
import { WeatherData } from '@fire-monitoring/shared';

function buildWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    id: 'w-test-01',
    stationId: '35.73.01.1001',
    locationName: 'Malang Test Station',
    temperatureC: 28.0,
    windSpeedKmh: 15.0,
    pressureHpa: 1010.0,
    uvIndex: 5.0,
    solarRadiationWm2: 500.0,
    precipitationMm: 0.0,
    lastRainfallAt: '2026-11-01T00:00:00.000Z',
    humidityPct: 55.0,
    recordedAt: '2026-11-06T06:00:00.000Z',
    syncedAt: '2026-11-06T06:00:00.000Z',
    isFallback: false,
    dataSource: 'BMKG_LIVE',
    ...overrides,
  };
}

describe('RuleBasedFireRiskModel', () => {
  const model = new RuleBasedFireRiskModel();

  it('1. classifies VERY_LOW risk (0-20) under cool, humid, calm, wet conditions', () => {
    const weather = buildWeather({
      temperatureC: 21.0,
      humidityPct: 82.0,
      windSpeedKmh: 4.0,
      precipitationMm: 12.0,
      uvIndex: 2.0,
    });
    const res = model.evaluate(weather, 0);
    expect(res.riskScore).toBeGreaterThanOrEqual(0);
    expect(res.riskScore).toBeLessThanOrEqual(20);
    expect(res.classification).toBe('VERY_LOW');
  });

  it('2. classifies LOW risk (21-40) under mild conditions', () => {
    const weather = buildWeather({
      temperatureC: 27.0,
      humidityPct: 62.0,
      windSpeedKmh: 12.0,
      precipitationMm: 0.0,
      uvIndex: 4.0,
    });
    const res = model.evaluate(weather, 3);
    expect(res.riskScore).toBeGreaterThanOrEqual(21);
    expect(res.riskScore).toBeLessThanOrEqual(40);
    expect(res.classification).toBe('LOW');
  });

  it('3. classifies MODERATE risk (41-60) under warm seasonal conditions', () => {
    const weather = buildWeather({
      temperatureC: 31.5,
      humidityPct: 48.0,
      windSpeedKmh: 22.0,
      precipitationMm: 0.0,
      uvIndex: 6.5,
    });
    const res = model.evaluate(weather, 7);
    expect(res.riskScore).toBeGreaterThanOrEqual(41);
    expect(res.riskScore).toBeLessThanOrEqual(60);
    expect(res.classification).toBe('MODERATE');
  });

  it('4. classifies HIGH risk (61-80) under hot, dry, windy conditions', () => {
    const weather = buildWeather({
      temperatureC: 36.5,
      humidityPct: 30.0,
      windSpeedKmh: 32.0,
      precipitationMm: 0.0,
      uvIndex: 8.5,
    });
    const res = model.evaluate(weather, 10);
    expect(res.riskScore).toBeGreaterThanOrEqual(61);
    expect(res.riskScore).toBeLessThanOrEqual(80);
    expect(res.classification).toBe('HIGH');
  });

  it('5. classifies EXTREME risk (81-100) during severe drought and heatwave', () => {
    const weather = buildWeather({
      temperatureC: 41.0,
      humidityPct: 18.0,
      windSpeedKmh: 42.0,
      precipitationMm: 0.0,
      uvIndex: 10.8,
    });
    const res = model.evaluate(weather, 14);
    expect(res.riskScore).toBeGreaterThanOrEqual(81);
    expect(res.riskScore).toBeLessThanOrEqual(100);
    expect(res.classification).toBe('EXTREME');
  });

  it('6. handles missing rainfall history gracefully without NaN', () => {
    const weather = buildWeather({ lastRainfallAt: null });
    const res = model.evaluate(weather, null);
    expect(Number.isNaN(res.riskScore)).toBe(false);
    expect(res.contributingFactors.find((f) => f.parameter === 'Dry Spell Duration')?.value).toContain(
      'History Unavailable'
    );
  });

  it('7. clamps high humidity (>=85%) to 0 humidity contribution', () => {
    const weather = buildWeather({ humidityPct: 94.0 });
    const res = model.evaluate(weather, 2);
    const humFactor = res.contributingFactors.find((f) => f.parameter === 'Relative Humidity');
    expect(humFactor?.contributionScore).toBe(0);
  });

  it('8. caps extreme temperature (>=42°C) at maximum 25-point contribution', () => {
    const weather = buildWeather({ temperatureC: 48.0 });
    const res = model.evaluate(weather, 5);
    const tempFactor = res.contributingFactors.find((f) => f.parameter === 'Ambient Temperature');
    expect(tempFactor?.contributionScore).toBe(25);
  });

  it('9. caps high wind speed (>=45 km/h) at maximum 20-point contribution', () => {
    const weather = buildWeather({ windSpeedKmh: 65.0 });
    const res = model.evaluate(weather, 5);
    const windFactor = res.contributingFactors.find((f) => f.parameter === 'Wind Speed');
    expect(windFactor?.contributionScore).toBe(20);
  });

  it('10. damps dry spell score by 75% when recent rainfall exceeds 2.0 mm', () => {
    const dryWeather = buildWeather({ precipitationMm: 0.0 });
    const wetWeather = buildWeather({ precipitationMm: 14.5 });
    const dryEval = model.evaluate(dryWeather, 14);
    const wetEval = model.evaluate(wetWeather, 14);

    const dryDroughtScore = dryEval.contributingFactors.find(
      (f) => f.parameter === 'Dry Spell Duration'
    )!.contributionScore;
    const wetDroughtScore = wetEval.contributingFactors.find(
      (f) => f.parameter === 'Dry Spell Duration'
    )!.contributionScore;

    expect(wetDroughtScore).toBeLessThan(dryDroughtScore);
    expect(wetDroughtScore).toBe(5); // 20 * 0.25 = 5
  });

  it('11. preserves score consistency when UV index is null (omitted by BMKG)', () => {
    const weather = buildWeather({ uvIndex: null, pressureHpa: null });
    const res = model.evaluate(weather, 6);
    const sumFactors = res.contributingFactors.reduce((acc, f) => acc + f.contributionScore, 0);
    expect(res.riskScore).toBe(sumFactors);
    expect(res.contributingFactors.find((f) => f.parameter === 'UV Index')?.value).toBe(
      'Unavailable'
    );
  });
});