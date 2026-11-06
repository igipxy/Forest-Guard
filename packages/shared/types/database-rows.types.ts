import { WeatherDataSource } from './weather.types';
import { CameraErrorCode, CameraStatus, StreamProtocol, StreamStatus } from './camera.types';
import { AlertCategory, AlertLifecycleStatus, AlertSeverity } from './alert.types';
import { ErrorCategory, LogLevel } from './log.types';

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