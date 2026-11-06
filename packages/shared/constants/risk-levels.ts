import { RiskClassification } from '../types/fire-risk.types';

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