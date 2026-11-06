import {
  CameraDevice,
  ICameraSyncService,
  StreamProbeResult,
  StreamStatus,
} from '@fire-monitoring/shared';
import { SystemLogger } from '@/lib/logger';
import { NotificationService } from './notification.service';

export class CameraSyncService implements ICameraSyncService {
  private readonly cameraWebApiUrl =
    process.env.CAMERA_WEB_API_URL || 'http://localhost:3001/api/v1';
  private readonly internalApiKey = process.env.CAMERA_API_SECRET || '';
  private readonly notificationService = new NotificationService();

  async syncCamerasWithStreamValidation(): Promise<CameraDevice[]> {
    const endpoint = `${this.cameraWebApiUrl}/cameras`;
    try {
      const response = await fetch(endpoint, {
        headers: {
          'X-Internal-Api-Key': this.internalApiKey,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Camera Management Web returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const rawCameras: CameraDevice[] = Array.isArray(payload) ? payload : payload.cameras;

      return await Promise.all(
        rawCameras.map(async (cam) => {
          // Rule 1: Camera OFFLINE -> Stream is automatically UNAVAILABLE
          if (cam.status === 'OFFLINE') {
            return {
              ...cam,
              streamStatus: 'UNAVAILABLE' as StreamStatus,
              streamPlayable: false,
              errorStatus: cam.errorStatus === 'NONE' ? 'HARDWARE_FAULT' : cam.errorStatus,
              errorMessage:
                cam.errorMessage || 'Camera reported OFFLINE by Camera Management Web.',
            };
          }

          // Rule 2: Camera ONLINE -> Independently probe HLS manifest (#EXTM3U)
          const probe = await this.probeManifest(cam.id, cam.streamUrl);
          if (probe.streamStatus === 'UNAVAILABLE') {
            await this.notificationService.createAlert({
              title: `Stream Unavailable on Online Camera (${cam.code})`,
              severity: 'WARNING',
              category: 'CAMERA',
              description: `${cam.name} is ONLINE, but HLS manifest validation failed: ${probe.errorMessage}`,
              location: cam.location,
              relatedCameraId: cam.id,
            });
          }

          return {
            ...cam,
            streamStatus: probe.streamStatus,
            streamPlayable: probe.streamPlayable,
            errorStatus: probe.errorStatus,
            errorMessage: probe.errorMessage,
          };
        })
      );
    } catch (error) {
      await SystemLogger.log({
        level: 'ERROR',
        httpStatus: 503,
        errorCategory: 'CAMERA_API_ERROR',
        message: `Camera Management API unreachable: ${
          error instanceof Error ? error.message : 'Unknown network failure'
        }`,
        requestEndpoint: endpoint,
        requestMethod: 'GET',
        sourceService: 'CameraSyncService',
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      return this.getDemoFallbackCameras();
    }
  }

  async validateSingleCameraStream(
    cameraId: string,
    streamUrl?: string
  ): Promise<StreamProbeResult> {
    const targetUrl =
      streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    return this.probeManifest(cameraId, targetUrl);
  }

  private async probeManifest(
    cameraId: string,
    streamUrl: string
  ): Promise<StreamProbeResult> {
    const startMs = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        await SystemLogger.log({
          level: 'WARN',
          httpStatus: response.status,
          errorCategory: 'STREAM_FAILURE',
          message: `HLS probe failed for camera ${cameraId}: HTTP ${response.status}`,
          requestEndpoint: streamUrl,
          requestMethod: 'GET',
          sourceService: 'CameraSyncService',
        });

        return {
          cameraId,
          streamUrl,
          streamStatus: 'UNAVAILABLE',
          streamPlayable: false,
          httpStatus: response.status,
          hasExtM3uHeader: false,
          latencyMs,
          errorStatus: 'STREAM_UNREACHABLE',
          errorMessage: `HLS endpoint returned HTTP ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const text = await response.text();
      const hasExtM3uHeader = text.trimStart().startsWith('#EXTM3U');

      if (!hasExtM3uHeader) {
        return {
          cameraId,
          streamUrl,
          streamStatus: 'UNAVAILABLE',
          streamPlayable: false,
          httpStatus: response.status,
          hasExtM3uHeader: false,
          latencyMs,
          errorStatus: 'INVALID_MANIFEST',
          errorMessage: 'Response missing #EXTM3U HLS playlist header',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        cameraId,
        streamUrl,
        streamStatus: 'PLAYABLE',
        streamPlayable: true,
        httpStatus: response.status,
        hasExtM3uHeader: true,
        latencyMs,
        errorStatus: 'NONE',
        errorMessage: null,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startMs;
      const errMsg =
        err instanceof Error ? err.message : 'HLS manifest connection timed out';

      await SystemLogger.log({
        level: 'WARN',
        httpStatus: 504,
        errorCategory: 'STREAM_FAILURE',
        message: `HLS stream probe exception for camera ${cameraId}: ${errMsg}`,
        requestEndpoint: streamUrl,
        requestMethod: 'GET',
        sourceService: 'CameraSyncService',
      });

      return {
        cameraId,
        streamUrl,
        streamStatus: 'UNAVAILABLE',
        streamPlayable: false,
        httpStatus: null,
        hasExtM3uHeader: false,
        latencyMs,
        errorStatus: 'TIMEOUT',
        errorMessage: errMsg,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private getDemoFallbackCameras(): CameraDevice[] {
    const now = Date.now();
    return [
      {
        id: 'cam-01',
        name: 'Tower Alpha - North Pine Ridge (Demo Stream)',
        code: 'CCTV-MLG-01',
        location: 'Sector A - North Pine Ridge',
        status: 'ONLINE',
        streamStatus: 'PLAYABLE',
        streamPlayable: true,
        streamProtocol: 'HLS',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        isDemoStream: true,
        lastHeartbeatAt: new Date(now - 9000).toISOString(),
        lastConnectedAt: new Date(now - 3600000 * 12).toISOString(),
        errorStatus: 'NONE',
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cam-02',
        name: 'Tower Bravo - Savanna Basin (Demo Stream)',
        code: 'CCTV-MLG-02',
        location: 'Sector B - Savanna Basin',
        status: 'ONLINE',
        streamStatus: 'UNAVAILABLE',
        streamPlayable: false,
        streamProtocol: 'HLS',
        streamUrl: 'https://unreachable-relay.example.invalid/live/stream.m3u8',
        isDemoStream: true,
        lastHeartbeatAt: new Date(now - 14000).toISOString(),
        lastConnectedAt: new Date(now - 3600000 * 4).toISOString(),
        errorStatus: 'STREAM_UNREACHABLE',
        errorMessage: 'Camera is ONLINE, but #EXTM3U manifest validation failed (HTTP 502)',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cam-03',
        name: 'Tower Charlie - East Corridor (Demo Stream)',
        code: 'CCTV-MLG-03',
        location: 'Sector C - East Transmission Corridor',
        status: 'OFFLINE',
        streamStatus: 'UNAVAILABLE',
        streamPlayable: false,
        streamProtocol: 'HLS',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        isDemoStream: true,
        lastHeartbeatAt: new Date(now - 2400000).toISOString(),
        lastConnectedAt: new Date(now - 86400000).toISOString(),
        errorStatus: 'HARDWARE_FAULT',
        errorMessage: 'Camera OFFLINE: Heartbeat lost (>40 mins).',
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}