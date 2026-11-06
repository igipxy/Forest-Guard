import { WeatherData } from '../types/weather.types';
import { FireRiskPrediction } from '../types/fire-risk.types';
import { CameraDevice, StreamProbeResult } from '../types/camera.types';

export interface IFireRiskModel {
  readonly modelVersion: string;
  readonly isHeuristic: boolean;
  evaluate(
    weather: WeatherData,
    historicalDryDays: number
  ): Omit<FireRiskPrediction, 'id' | 'predictedAt'>;
}

export interface IStreamProbeService {
  probeHlsStream(cameraId: string, streamUrl: string): Promise<StreamProbeResult>;
}

export interface ICameraSyncService {
  syncCamerasWithStreamValidation(): Promise<CameraDevice[]>;
  validateSingleCameraStream(cameraId: string): Promise<StreamProbeResult>;
}