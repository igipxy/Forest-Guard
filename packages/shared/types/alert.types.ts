export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertCategory = 'FIRE_RISK' | 'WEATHER' | 'CAMERA' | 'SYSTEM_SYNC';

export interface SystemAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  category: AlertCategory;
  description: string;
  location?: string | null;
  relatedCameraId?: string | null;
  isRead: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
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