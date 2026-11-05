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
  stackTrace?: string | null; // Stripped for OPERATOR role
}