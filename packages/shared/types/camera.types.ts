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
  hasPlayableSegments?: boolean;
  latencyMs: number;
  errorStatus: CameraErrorCode;
  errorMessage: string | null;
  checkedAt: string;
}