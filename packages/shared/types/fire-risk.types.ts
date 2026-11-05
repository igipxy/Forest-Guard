export type RiskClassification = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface ContributingFactor {
  parameter: string;
  value: string;
  weight: number;
  contributionScore: number;
  impactLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface FireRiskPrediction {
  id: string;
  weatherRecordId: string;
  location: string;
  riskScore: number; // 0 - 100
  classification: RiskClassification;
  modelVersion: string;
  isHeuristic: boolean;
  disclaimer: string;
  contributingFactors: ContributingFactor[];
  vulnerableAreas: string[];
  predictedAt: string;
}

export interface DailyFireRiskReport {
  id: string;
  reportDate: string;
  maxTemperatureC: number;
  avgWindSpeedKmh: number;
  totalPrecipitationMm: number;
  avgHumidityPct: number;
  lastRainfallAt: string | null;
  dailyRiskScore: number;
  riskClassification: RiskClassification;
  highestRiskPeriod: string;
  vulnerableAreas: string[];
  riskFactorAnalysis: string;
  recommendedActions: string[];
  generatedAt: string;
}