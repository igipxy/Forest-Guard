import { z } from 'zod';

// ============================================================================
// 1. WEATHER TYPES
// ============================================================================
export type WeatherDataSource =
  | 'BMKG_LIVE'
  | 'CACHED_FALLBACK'
  | 'DEMO_SIMULATION'
  | 'DATA_UNAVAILABLE';

export type WeatherTimeRange = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface WeatherData {
  id: string;
  stationId: string;
  locationName: string;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  pressureHpa: number | null;
  uvIndex: number | null;
  solarRadiationWm2: number | null;
  precipitationMm: number | null;
  lastRainfallAt: string | null;
  humidityPct: number | null;
  recordedAt: string;
  syncedAt: string;
  isFallback?: boolean;
  dataSource: WeatherDataSource;
}

// ============================================================================
// 2. CAMERA & STREAM TYPES
// ============================================================================
export type CameraStatus = 'ONLINE' | 'OFFLINE';
export type StreamStatus = 'PLAYABLE' | 'UNAVAILABLE' | 'CHECKING';
export type StreamProtocol = 'HLS' | 'WEBRTC';

export type CameraErrorCode =
  | 'NONE'
  | 'STREAM_UNREACHABLE'
  | 'INVALID_MANIFEST'
  | 'SEGMENT_ERROR'
  | 'TIMEOUT'
  | 'HTTP_500'
  | 'HEARTBEAT_EXPIRED'
  | 'AUTH_ERROR'
  | 'HARDWARE_FAULT';

export interface CameraDevice {
  id: string;
  name: string;
  code: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  status: CameraStatus;
  streamStatus: StreamStatus;
  streamPlayable: boolean;
  streamProtocol: StreamProtocol;
  streamUrl: string;
  isDemoStream?: boolean;
  lastHeartbeatAt: string | null;
  lastConnectedAt: string | null;
  errorStatus: CameraErrorCode;
  errorMessage?: string | null;
  updatedAt: string;
}

export interface StreamProbeResult {
  cameraId: string;
  streamUrl: string;
  streamStatus: StreamStatus;
  streamPlayable: boolean;
  httpStatus: number | null;
  hasExtM3uHeader: boolean;
  hasPlayableSegments?: boolean;
  latencyMs: number;
  errorStatus: CameraErrorCode;
  errorMessage: string | null;
  checkedAt: string;
}

// ============================================================================
// 3. FIRE RISK & REPORT TYPES
// ============================================================================
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

// ============================================================================
// 4. ALERT & NOTIFICATION TYPES
// ============================================================================
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertCategory = 'FIRE_RISK' | 'WEATHER' | 'CAMERA' | 'SYSTEM_SYNC';
export type AlertLifecycleStatus = 'CREATED' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface SystemAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status?: AlertLifecycleStatus;
  dedupKey?: string;
  occurrenceCount?: number;
  lastSeenAt?: string;
  description: string;
  location?: string | null;
  relatedCameraId?: string | null;
  isRead: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface AlertThresholds {
  id: string;
  maxTemperatureC: number;
  maxWindSpeedKmh: number;
  minHumidityPct: number;
  maxDryDays: number;
  highRiskThreshold: number;
  extremeRiskThreshold: number;
  updatedAt: string;
}

// ============================================================================
// 5. SYSTEM LOG & RBAC TYPES
// ============================================================================
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type UserRole = 'OPERATOR' | 'ADMIN';

export type ErrorCategory =
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

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  httpStatus?: number | null;
  errorCategory: ErrorCategory;
  message: string;
  requestEndpoint?: string | null;
  requestMethod?: string | null;
  sourceService: string;
  metadata?: Record<string, unknown> | null;
  stackTrace?: string | null;
}

// ============================================================================
// 6. DATABASE ROW MAPPING INTERFACES
// ============================================================================
export interface WeatherRecordRow {
  id: string;
  station_id: string;
  location_name: string;
  temperature_c: number | string | null;
  wind_speed_kmh: number | string | null;
  pressure_hpa: number | string | null;
  uv_index: number | string | null;
  solar_radiation_wm2: number | string | null;
  precipitation_mm: number | string | null;
  last_rainfall_at: string | null;
  humidity_pct: number | string | null;
  recorded_at: string;
  synced_at: string;
  is_fallback: boolean;
  data_source: WeatherDataSource;
}

export interface CameraRow {
  id: string;
  name: string;
  code: string;
  location: string;
  latitude: number | string | null;
  longitude: number | string | null;
  status: CameraStatus;
  stream_status: StreamStatus;
  stream_playable: boolean;
  stream_protocol: StreamProtocol;
  stream_url: string;
  is_demo_stream: boolean;
  last_heartbeat_at: string | null;
  last_connected_at: string | null;
  error_status: CameraErrorCode;
  error_message: string | null;
  updated_at: string;
}

export interface AlertRow {
  id: string;
  dedup_key: string | null;
  title: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertLifecycleStatus;
  occurrence_count: number;
  last_seen_at: string;
  description: string;
  location: string | null;
  related_camera_id: string | null;
  is_read: boolean;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface SystemLogRow {
  id: string;
  timestamp: string;
  level: LogLevel;
  http_status: number | null;
  error_category: ErrorCategory;
  message: string;
  request_endpoint: string | null;
  request_method: string | null;
  source_service: string;
  metadata: Record<string, unknown> | null;
  stack_trace: string | null;
}

// ============================================================================
// 7. CONSTANTS & SERVICE INTERFACES
// ============================================================================
export const FIRE_RISK_WEIGHTS = {
  TEMPERATURE: 0.25,
  HUMIDITY: 0.25,
  WIND_SPEED: 0.20,
  DRY_SPELL: 0.20,
  UV_INDEX: 0.10,
} as const;

export const FIRE_RISK_BANDS: Record<
  RiskClassification,
  { min: number; max: number; label: string; colorHex: string }
> = {
  VERY_LOW: { min: 0, max: 20, label: 'Very Low', colorHex: '#22C55E' },
  LOW: { min: 21, max: 40, label: 'Low', colorHex: '#38BDF8' },
  MODERATE: { min: 41, max: 60, label: 'Moderate', colorHex: '#EAB308' },
  HIGH: { min: 61, max: 80, label: 'High', colorHex: '#F59E0B' },
  EXTREME: { min: 81, max: 100, label: 'Extreme', colorHex: '#EF4444' },
};

export const HEURISTIC_FIRE_RISK_DISCLAIMER =
  'Environmental Susceptibility Indicator: This score estimates weather-driven ignition and spread potential. It does NOT represent confirmed optical or thermal fire detection.';

export function classifyFireRiskScore(score: number): RiskClassification {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped <= 20) return 'VERY_LOW';
  if (clamped <= 40) return 'LOW';
  if (clamped <= 60) return 'MODERATE';
  if (clamped <= 80) return 'HIGH';
  return 'EXTREME';
}

export interface IFireRiskModel {
  readonly modelVersion: string;
  readonly isHeuristic: boolean;
  evaluate(
    weather: WeatherData,
    historicalDryDays?: number | null
  ): Omit<FireRiskPrediction, 'id' | 'predictedAt'>;
}

export interface IStreamProbeService {
  probeHlsStream(cameraId: string, streamUrl: string): Promise<StreamProbeResult>;
}

export interface ICameraSyncService {
  syncCamerasWithStreamValidation(): Promise<CameraDevice[]>;
  validateSingleCameraStream(cameraId: string, streamUrl?: string): Promise<StreamProbeResult>;
}

// ============================================================================
// 8. ZOD VALIDATION SCHEMAS
// ============================================================================
export const CameraCreateSchema = z.object({
  name: z.string().min(3).max(128),
  code: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[A-Z0-9-_]+$/i, 'Alphanumeric, hyphen, or underscore only'),
  location: z.string().min(3).max(128),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  status: z.enum(['ONLINE', 'OFFLINE']).default('ONLINE'),
  streamProtocol: z.enum(['HLS', 'WEBRTC']).default('HLS'),
  streamUrl: z.string().url('Must be a valid stream URL'),
  isDemoStream: z.boolean().default(false),
});

export const CameraUpdateSchema = CameraCreateSchema.partial().extend({
  streamStatus: z.enum(['PLAYABLE', 'UNAVAILABLE', 'CHECKING']).optional(),
  errorStatus: z
    .enum([
      'NONE',
      'STREAM_UNREACHABLE',
      'INVALID_MANIFEST',
      'SEGMENT_ERROR',
      'TIMEOUT',
      'HTTP_500',
      'HEARTBEAT_EXPIRED',
      'AUTH_ERROR',
      'HARDWARE_FAULT',
    ])
    .optional(),
  errorMessage: z.string().max(500).nullable().optional(),
});

export const HeartbeatPayloadSchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE']),
  streamUrl: z.string().url().optional(),
  latencyMs: z.number().nonnegative().optional(),
});

export const AlertThresholdUpdateSchema = z.object({
  maxTemperatureC: z.number().min(20).max(55),
  maxWindSpeedKmh: z.number().min(5).max(150),
  minHumidityPct: z.number().min(5).max(95),
  maxDryDays: z.number().int().min(1).max(90),
  highRiskThreshold: z.number().int().min(40).max(79),
  extremeRiskThreshold: z.number().int().min(80).max(100),
});

export const WeatherScenarioOverrideSchema = z.object({
  temperatureC: z.number().min(0).max(60),
  humidityPct: z.number().min(1).max(100),
  windSpeedKmh: z.number().min(0).max(200),
  pressureHpa: z.number().min(900).max(1080).default(1008.5),
  uvIndex: z.number().min(0).max(16),
  precipitationMm: z.number().min(0).max(500),
  dryDays: z.number().int().min(0).max(120),
});