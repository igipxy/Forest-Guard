export type CameraStatus = 'ONLINE' | 'OFFLINE';
export type StreamStatus = 'PLAYABLE' | 'UNAVAILABLE';
export type StreamProtocol = 'HLS' | 'WEBRTC';

export type CameraErrorCode =
  | 'NONE'
  | 'STREAM_UNREACHABLE'
  | 'INVALID_MANIFEST'
  | 'TIMEOUT'
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
  isDemoStream: boolean;
  lastHeartbeatAt: string | null;
  lastConnectedAt: string | null;
  errorStatus: CameraErrorCode;
  errorMessage: string | null;
  updatedAt: string;
}

export interface StreamProbeResult {
  cameraId: string;
  streamUrl: string;
  streamStatus: StreamStatus;
  streamPlayable: boolean;
  httpStatus: number | null;
  hasExtM3uHeader: boolean;
  latencyMs: number;
  errorStatus: CameraErrorCode;
  errorMessage: string | null;
  checkedAt: string;
}