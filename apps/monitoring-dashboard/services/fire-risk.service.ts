import {
  IFireRiskModel,
  WeatherData,
  FireRiskPrediction,
  RiskClassification,
  ContributingFactor,
} from '@fire-monitoring/shared';

export class RuleBasedFireRiskModel implements IFireRiskModel {
  public readonly modelVersion = 'heuristic-v1.2.0';
  public readonly isHeuristic = true;

  evaluate(
    weather: WeatherData,
    historicalDryDays: number
  ): Omit<FireRiskPrediction, 'id' | 'predictedAt'> {
    // 1. Temperature Sub-score (Weight: 25%) - 20°C = 0, 42°C+ = 100
    const tempNormalized = Math.min(100, Math.max(0, ((weather.temperatureC - 20) / 22) * 100));
    const tempContribution = Math.round(tempNormalized * 0.25);

    // 2. Relative Humidity Inverse Sub-score (Weight: 25%) - 85% = 0, 15% = 100
    const humidityNormalized = Math.min(100, Math.max(0, ((85 - weather.humidityPct) / 70) * 100));
    const humidityContribution = Math.round(humidityNormalized * 0.25);

    // 3. Wind Speed Sub-score (Weight: 20%) - 0 km/h = 0, 45+ km/h = 100
    const windNormalized = Math.min(100, Math.max(0, (weather.windSpeedKmh / 45) * 100));
    const windContribution = Math.round(windNormalized * 0.20);

    // 4. Drought / Days Since Rainfall Sub-score (Weight: 20%) - 0 days = 0, 14+ days = 100
    const rainPenalty = weather.precipitationMm > 2.0 ? 0.25 : 1.0;
    const droughtNormalized =
      Math.min(100, Math.max(0, (historicalDryDays / 14) * 100)) * rainPenalty;
    const droughtContribution = Math.round(droughtNormalized * 0.20);

    // 5. Solar Radiation / UV Index Sub-score (Weight: 10%) - UV 0 = 0, UV 11+ = 100
    const uvNormalized = Math.min(100, Math.max(0, (weather.uvIndex / 11) * 100));
    const uvContribution = Math.round(uvNormalized * 0.10);

    const rawScore =
      tempContribution +
      humidityContribution +
      windContribution +
      droughtContribution +
      uvContribution;

    const riskScore = Math.min(100, Math.max(0, rawScore));
    const classification = this.classifyScore(riskScore);

    const contributingFactors: ContributingFactor[] = [
      {
        parameter: 'Relative Humidity',
        value: `${weather.humidityPct.toFixed(1)}%`,
        weight: 0.25,
        contributionScore: humidityContribution,
        impactLevel: humidityNormalized > 75 ? 'CRITICAL' : humidityNormalized > 50 ? 'HIGH' : 'MODERATE',
      },
      {
        parameter: 'Ambient Temperature',
        value: `${weather.temperatureC.toFixed(1)} °C`,
        weight: 0.25,
        contributionScore: tempContribution,
        impactLevel: tempNormalized > 75 ? 'CRITICAL' : tempNormalized > 50 ? 'HIGH' : 'MODERATE',
      },
      {
        parameter: 'Dry Spell Duration',
        value: `${historicalDryDays} days (${weather.precipitationMm.toFixed(1)} mm rain)`,
        weight: 0.20,
        contributionScore: droughtContribution,
        impactLevel: droughtNormalized > 75 ? 'CRITICAL' : droughtNormalized > 45 ? 'HIGH' : 'LOW',
      },
      {
        parameter: 'Wind Velocity',
        value: `${weather.windSpeedKmh.toFixed(1)} km/h`,
        weight: 0.20,
        contributionScore: windContribution,
        impactLevel: windNormalized > 70 ? 'CRITICAL' : windNormalized > 45 ? 'HIGH' : 'LOW',
      },
      {
        parameter: 'UV & Solar Radiation',
        value: `UV ${weather.uvIndex.toFixed(1)} (${weather.solarRadiationWm2} W/m²)`,
        weight: 0.10,
        contributionScore: uvContribution,
        impactLevel: uvNormalized > 75 ? 'HIGH' : 'MODERATE',
      },
    ];

    return {
      weatherRecordId: weather.id,
      location: weather.locationName,
      riskScore,
      classification,
      modelVersion: this.modelVersion,
      isHeuristic: this.isHeuristic,
      disclaimer:
        'Heuristic Weather-Based Risk Indicator: This score represents environmental susceptibility to fire ignition/spread, NOT confirmed optical or thermal fire detection.',
      contributingFactors,
      vulnerableAreas: this.identifyVulnerableZones(riskScore),
    };
  }

  private classifyScore(score: number): RiskClassification {
    if (score <= 20) return 'VERY_LOW';
    if (score <= 40) return 'LOW';
    if (score <= 60) return 'MODERATE';
    if (score <= 80) return 'HIGH';
    return 'EXTREME';
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

  public computeRisk(weather: WeatherData): FireRiskPrediction {
    const dryDays = weather.lastRainfallAt
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(weather.lastRainfallAt).getTime()) / 86400000)
        )
      : 7;

    const result = this.model.evaluate(weather, dryDays);
    return {
      ...result,
      id: `pred-${Date.now()}`,
      predictedAt: new Date().toISOString(),
    };
  }
}