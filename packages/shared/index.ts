export type RiskClassification = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type CameraStatus = 'ONLINE' | 'OFFLINE';
export type StreamProtocol = 'HLS' | 'WEBRTC';
export type UserRole = 'OPERATOR' | 'ADMIN';
export * from './types/weather.types';
export * from './types/camera.types';
export * from './types/fire-risk.types';
export * from './types/alert.types';
export * from './types/log.types';
export * from './types/database-rows.types';
export * from './constants/risk-levels';
export * from './interfaces/services.interface';
export * from './schemas/validation.schema';
export * from './types/weather.types';
export * from './types/camera.types';
export * from './types/fire-risk.types';
export * from './types/alert.types';
export * from './types/log.types';
export * from './constants/risk-levels';
export * from './interfaces/services.interface';
export * from './schemas/validation.schema';

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
  isFallback?: boolean;
}

export interface CameraDevice {
  id: string;
  name: string;
  code: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: CameraStatus;
  streamProtocol: StreamProtocol;
  streamUrl: string;
  streamPlayable: boolean;
  lastHeartbeatAt: string | null;
  lastConnectedAt: string | null;
  errorStatus: 'NONE' | 'STREAM_UNREACHABLE' | 'TIMEOUT' | 'AUTH_ERROR' | 'HARDWARE_FAULT';
  errorMessage?: string | null;
  updatedAt: string;
}

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

export interface SystemAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  category: 'FIRE_RISK' | 'WEATHER' | 'CAMERA' | 'SYSTEM_SYNC';
  description: string;
  location?: string;
  relatedCameraId?: string;
  isRead: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  httpStatus?: number | null;
  errorCategory:
    | 'HTTP_400'
    | 'HTTP_401'
    | 'HTTP_403'
    | 'HTTP_404'
    | 'HTTP_500'
    | 'BMKG_API_ERROR'
    | 'CAMERA_API_ERROR'
    | 'STREAM_FAILURE'
    | 'DB_CONNECTION_ERROR'
    | 'AUTH_FAILURE'
    | 'WEBSOCKET_ERROR'
    | 'BACKGROUND_JOB_FAILURE'
    | 'SYSTEM_EVENT';
  message: string;
  requestEndpoint?: string;
  requestMethod?: string;
  sourceService: string;
  stackTrace?: string; // Stripped for non-ADMIN users
}

export interface IFireRiskModel {
  readonly modelVersion: string;
  readonly isHeuristic: boolean;
  evaluate(weather: WeatherData, historicalDryDays: number): Omit<FireRiskPrediction, 'id' | 'predictedAt'>;
}