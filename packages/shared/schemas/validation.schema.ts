import { z } from 'zod';

export const CameraCreateSchema = z.object({
  name: z.string().min(3).max(128),
  code: z.string().min(3).max(64).regex(/^[A-Z0-9-_]+$/i, 'Alphanumeric, hyphen, or underscore only'),
  location: z.string().min(3).max(128),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  status: z.enum(['ONLINE', 'OFFLINE']).default('ONLINE'),
  streamProtocol: z.enum(['HLS', 'WEBRTC']).default('HLS'),
  streamUrl: z.string().url('Must be a valid stream URL'),
  isDemoStream: z.boolean().default(false),
});

export const CameraUpdateSchema = CameraCreateSchema.partial().extend({
  streamStatus: z.enum(['PLAYABLE', 'UNAVAILABLE']).optional(),
  errorStatus: z
    .enum(['NONE', 'STREAM_UNREACHABLE', 'INVALID_MANIFEST', 'TIMEOUT', 'AUTH_ERROR', 'HARDWARE_FAULT'])
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