import {
  IFireRiskModel,
  WeatherData,
  FireRiskPrediction,
  ContributingFactor,
  classifyFireRiskScore,
  FIRE_RISK_WEIGHTS,
  HEURISTIC_FIRE_RISK_DISCLAIMER,
} from '@fire-monitoring/shared';

export class RuleBasedFireRiskModel implements IFireRiskModel {
  public readonly modelVersion = 'heuristic-v1.3.0';
  public readonly isHeuristic = true;

  evaluate(
    weather: WeatherData,
    historicalDryDays?: number | null
  ): Omit<FireRiskPrediction, 'id' | 'predictedAt'> {
    // 1. Compute raw normalized sub-scores (0-100) only for available parameters
    const tempAvailable =
      weather.temperatureC !== null && Number.isFinite(weather.temperatureC);
    const tempNorm = tempAvailable
      ? Math.min(100, Math.max(0, (((weather.temperatureC as number) - 20) / 22) * 100))
      : 0;

    const humAvailable =
      weather.humidityPct !== null && Number.isFinite(weather.humidityPct);
    const humNorm = humAvailable
      ? Math.min(100, Math.max(0, ((85 - (weather.humidityPct as number)) / 70) * 100))
      : 0;

    const windAvailable =
      weather.windSpeedKmh !== null && Number.isFinite(weather.windSpeedKmh);
    const windNorm = windAvailable
      ? Math.min(100, Math.max(0, ((weather.windSpeedKmh as number) / 45) * 100))
      : 0;

    // Resolve dry days: explicit argument -> derived from lastRainfallAt -> neutral default (5 days) if history missing
    const resolvedDryDays =
      typeof historicalDryDays === 'number' && Number.isFinite(historicalDryDays)
        ? Math.max(0, historicalDryDays)
        : weather.lastRainfallAt
        ? Math.max(
            0,
            Math.floor(
              (new Date(weather.recordedAt).getTime() -
                new Date(weather.lastRainfallAt).getTime()) /
                86_400_000
            )
          )
        : null;

    const rainMm = weather.precipitationMm ?? 0;
    const rainDamping = rainMm > 2.0 ? 0.25 : 1.0;
    const effectiveDryDays = resolvedDryDays ?? 5; // Neutral conservative baseline when rainfall history is absent
    const droughtNorm =
      Math.min(100, Math.max(0, (effectiveDryDays / 14) * 100)) * rainDamping;
    const droughtAvailable =
      resolvedDryDays !== null || weather.precipitationMm !== null;

    const uvAvailable = weather.uvIndex !== null && Number.isFinite(weather.uvIndex);
    const uvNorm = uvAvailable
      ? Math.min(100, Math.max(0, ((weather.uvIndex as number) / 11) * 100))
      : 0;

    // Calculate active weight sum so missing optional sensors (e.g., UV) don't artificially cap risk at 90
    const rawWeights = {
      temp: tempAvailable ? FIRE_RISK_WEIGHTS.TEMPERATURE : 0,
      hum: humAvailable ? FIRE_RISK_WEIGHTS.HUMIDITY : 0,
      wind: windAvailable ? FIRE_RISK_WEIGHTS.WIND_SPEED : 0,
      drought: droughtAvailable ? FIRE_RISK_WEIGHTS.DRY_SPELL : 0,
      uv: uvAvailable ? FIRE_RISK_WEIGHTS.UV_INDEX : 0,
    };

    const activeWeightSum =
      rawWeights.temp +
      rawWeights.hum +
      rawWeights.wind +
      rawWeights.drought +
      rawWeights.uv;

    const scale = activeWeightSum > 0 ? 1 / activeWeightSum : 0;

    const wTemp = Number((rawWeights.temp * scale).toFixed(4));
    const wHum = Number((rawWeights.hum * scale).toFixed(4));
    const wWind = Number((rawWeights.wind * scale).toFixed(4));
    const wDrought = Number((rawWeights.drought * scale).toFixed(4));
    const wUv = Number((rawWeights.uv * scale).toFixed(4));

    const tempContribution = Math.round(tempNorm * wTemp);
    const humContribution = Math.round(humNorm * wHum);
    const windContribution = Math.round(windNorm * wWind);
    const droughtContribution = Math.round(droughtNorm * wDrought);
    const uvContribution = Math.round(uvNorm * wUv);

    const sumContributions =
      tempContribution +
      humContribution +
      windContribution +
      droughtContribution +
      uvContribution;

    const riskScore = Math.min(100, Math.max(0, sumContributions));
    const classification = classifyFireRiskScore(riskScore);

    const contributingFactors: ContributingFactor[] = [
      {
        parameter: 'Ambient Temperature',
        value: tempAvailable ? `${weather.temperatureC!.toFixed(1)} °C` : 'Unavailable',
        weight: FIRE_RISK_WEIGHTS.TEMPERATURE,
        contributionScore: tempContribution,
        isAvailable: tempAvailable,
        impactLevel: !tempAvailable
          ? 'UNAVAILABLE'
          : tempNorm > 75
          ? 'CRITICAL'
          : tempNorm > 50
          ? 'HIGH'
          : tempNorm > 25
          ? 'MODERATE'
          : 'LOW',
      },
      {
        parameter: 'Relative Humidity',
        value: humAvailable ? `${weather.humidityPct!.toFixed(1)}%` : 'Unavailable',
        weight: FIRE_RISK_WEIGHTS.HUMIDITY,
        contributionScore: humContribution,
        isAvailable: humAvailable,
        impactLevel: !humAvailable
          ? 'UNAVAILABLE'
          : humNorm > 75
          ? 'CRITICAL'
          : humNorm > 50
          ? 'HIGH'
          : humNorm > 25
          ? 'MODERATE'
          : 'LOW',
      },
      {
        parameter: 'Wind Speed',
        value: windAvailable ? `${weather.windSpeedKmh!.toFixed(1)} km/h` : 'Unavailable',
        weight: FIRE_RISK_WEIGHTS.WIND_SPEED,
        contributionScore: windContribution,
        isAvailable: windAvailable,
        impactLevel: !windAvailable
          ? 'UNAVAILABLE'
          : windNorm > 70
          ? 'CRITICAL'
          : windNorm > 45
          ? 'HIGH'
          : windNorm > 20
          ? 'MODERATE'
          : 'LOW',
      },
      {
        parameter: 'Dry Spell Duration',
        value:
          resolvedDryDays !== null
            ? `${resolvedDryDays} days (${rainMm.toFixed(1)} mm rain)`
            : `History Unavailable (${rainMm.toFixed(1)} mm rain)`,
        weight: FIRE_RISK_WEIGHTS.DRY_SPELL,
        contributionScore: droughtContribution,
        isAvailable: droughtAvailable,
        impactLevel: !droughtAvailable
          ? 'UNAVAILABLE'
          : droughtNorm > 75
          ? 'CRITICAL'
          : droughtNorm > 45
          ? 'HIGH'
          : droughtNorm > 20
          ? 'MODERATE'
          : 'LOW',
      },
      {
        parameter: 'UV Index',
        value: uvAvailable ? `UV ${weather.uvIndex!.toFixed(1)}` : 'Unavailable',
        weight: FIRE_RISK_WEIGHTS.UV_INDEX,
        contributionScore: uvContribution,
        isAvailable: uvAvailable,
        impactLevel: !uvAvailable
          ? 'UNAVAILABLE'
          : uvNorm > 75
          ? 'CRITICAL'
          : uvNorm > 50
          ? 'HIGH'
          : uvNorm > 25
          ? 'MODERATE'
          : 'LOW',
      },
    ];

    return {
      weatherRecordId: weather.id,
      location: weather.locationName,
      riskScore,
      classification,
      modelVersion: this.modelVersion,
      isHeuristic: this.isHeuristic,
      dataSource: weather.dataSource,
      disclaimer: HEURISTIC_FIRE_RISK_DISCLAIMER,
      contributingFactors,
      vulnerableAreas: this.identifyVulnerableZones(riskScore),
    };
  }

  private identifyVulnerableZones(score: number): string[] {
    if (score >= 81) {
      return [
        'Sector A - North Pine Ridge',
        'Sector B - Savanna Basin',
        'Sector C - East Transmission Corridor',
        'Sector D - Highland Perimeter',
      ];
    }
    if (score >= 61) {
      return ['Sector A - North Pine Ridge', 'Sector B - Savanna Basin'];
    }
    if (score >= 41) {
      return ['Sector B - Savanna Basin'];
    }
    return [];
  }
}

export class FireRiskEngineService {
  private model: IFireRiskModel;

  constructor(model: IFireRiskModel = new RuleBasedFireRiskModel()) {
    this.model = model;
  }

  public setModel(nextModel: IFireRiskModel): void {
    this.model = nextModel;
  }

  public computeRisk(weather: WeatherData, overrideDryDays?: number | null): FireRiskPrediction {
    const evaluated = this.model.evaluate(weather, overrideDryDays);
    return {
      ...evaluated,
      id: `pred-${Date.now()}`,
      predictedAt: new Date().toISOString(),
    };
  }
}