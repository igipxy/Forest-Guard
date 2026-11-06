import { WeatherDataSource } from './weather.types';

export type RiskClassification = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface ContributingFactor {
  parameter: string;
  value: string;
  weight: number;
  contributionScore: number;
  isAvailable?: boolean;
  impactLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNAVAILABLE';
}

export interface FireRiskPrediction {
  id: string;
  weatherRecordId: string;
  location: string;
  riskScore: number;
  classification: RiskClassification;
  modelVersion: string;
  isHeuristic: boolean;
  dataSource?: WeatherDataSource;
  disclaimer: string;
  contributingFactors: ContributingFactor[];
  vulnerableAreas: string[];
  predictedAt: string;
}

export interface DailyFireRiskReport {
  id: string;
  reportDate: string;
  maxTemperatureC: number | null;
  avgWindSpeedKmh: number | null;
  totalPrecipitationMm: number | null;
  avgHumidityPct: number | null;
  lastRainfallAt: string | null;
  dailyRiskScore: number;
  riskClassification: RiskClassification;
  highestRiskPeriod: string;
  vulnerableAreas: string[];
  riskFactorAnalysis: string;
  recommendedActions: string[];
  recordCount?: number;
  generatedAt: string;
}