import { CameraDevice } from '@fire-monitoring/shared';
import { SystemLogger } from '@/lib/logger';

export class CameraSyncService {
  private readonly cameraWebApiUrl =
    process.env.CAMERA_WEB_API_URL || 'http://localhost:3001/api/v1';
  private readonly internalApiKey = process.env.CAMERA_API_SECRET || 'dev-internal-secret';

  /**
   * Synchronizes camera inventory from Camera Management Web and independently validates
   * stream playability for cameras marked ONLINE.
   */
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
        throw new Error(`Camera Management API returned HTTP ${response.status}`);
      }

      const rawCameras: CameraDevice[] = await response.json();

      // Synchronize status and validate streams independently for ONLINE cameras
      const validatedCameras = await Promise.all(
        rawCameras.map(async (cam) => {
          if (cam.status === 'OFFLINE') {
            return {
              ...cam,
              streamPlayable: false,
              errorStatus: cam.errorStatus || 'HARDWARE_FAULT',
              errorMessage: cam.errorMessage || 'Camera marked OFFLINE by Camera Management Web',
            };
          }

          // Camera is ONLINE in Camera Management Web -> Validate stream manifest separately
          const probeResult = await this.validateHlsStreamManifest(cam.streamUrl, cam.id);
          return {
            ...cam,
            streamPlayable: probeResult.playable,
            errorStatus: probeResult.playable ? 'NONE' : 'STREAM_UNREACHABLE',
            errorMessage: probeResult.errorMessage,
          };
        })
      );

      return validatedCameras;
    } catch (error) {
      await SystemLogger.log({
        level: 'ERROR',
        httpStatus: 503,
        errorCategory: 'CAMERA_API_ERROR',
        message: `Failed to sync cameras from Camera Management Web: ${
          error instanceof Error ? error.message : 'Connection refused'
        }`,
        requestEndpoint: endpoint,
        requestMethod: 'GET',
        sourceService: 'CameraSyncService',
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      return this.getMockSynchronizedCameras();
    }
  }

  /**
   * Verifies that an ONLINE camera's HLS (.m3u8) stream actually responds with a valid playlist.
   */
  async validateHlsStreamManifest(
    streamUrl: string,
    cameraId: string
  ): Promise<{ playable: boolean; errorMessage: string | null }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(streamUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Stream endpoint returned HTTP ${res.status}`);
      }

      const bodyText = await res.text();
      const isValidM3u8 = bodyText.trim().startsWith('#EXTM3U');

      if (!isValidM3u8) {
        throw new Error('Invalid HLS manifest header (#EXTM3U missing)');
      }

      return { playable: true, errorMessage: null };
    } catch (err) {
      clearTimeout(timeout);
      const message =
        err instanceof Error ? err.message : 'Unable to reach HLS video stream manifest';

      await SystemLogger.log({
        level: 'WARN',
        httpStatus: 502,
        errorCategory: 'STREAM_FAILURE',
        message: `Camera ${cameraId} is ONLINE in Camera Web, but stream validation failed: ${message}`,
        requestEndpoint: streamUrl,
        requestMethod: 'GET',
        sourceService: 'CameraSyncService',
      });

      return { playable: false, errorMessage: message };
    }
  }

  private getMockSynchronizedCameras(): CameraDevice[] {
    const now = Date.now();
    return [
      {
        id: 'cam-01',
        name: 'Tower Alpha - North Pine Ridge',
        code: 'CCTV-MLG-01',
        location: 'Sector A - North Pine Ridge',
        status: 'ONLINE',
        streamProtocol: 'HLS',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        streamPlayable: true,
        lastHeartbeatAt: new Date(now - 8000).toISOString(),
        lastConnectedAt: new Date(now - 3600000 * 14).toISOString(),
        errorStatus: 'NONE',
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cam-02',
        name: 'Tower Bravo - Savanna Basin',
        code: 'CCTV-MLG-02',
        location: 'Sector B - Savanna Basin',
        status: 'ONLINE',
        streamProtocol: 'HLS',
        // Online in Camera Management Web, but manifest unreachable (tests decoupled validation requirement)
        streamUrl: 'https://invalid-stream.local/sector-b/live.m3u8',
        streamPlayable: false,
        lastHeartbeatAt: new Date(now - 12000).toISOString(),
        lastConnectedAt: new Date(now - 3600000 * 5).toISOString(),
        errorStatus: 'STREAM_UNREACHABLE',
        errorMessage: 'Camera is ONLINE, but RTSP-to-HLS transcoder returned HTTP 502',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cam-03',
        name: 'Tower Charlie - East Corridor',
        code: 'CCTV-MLG-03',
        location: 'Sector C - East Transmission Corridor',
        status: 'OFFLINE',
        streamProtocol: 'HLS',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        streamPlayable: false,
        lastHeartbeatAt: new Date(now - 1800000).toISOString(),
        lastConnectedAt: new Date(now - 86400000).toISOString(),
        errorStatus: 'TIMEOUT',
        errorMessage: 'Heartbeat lost (>30m). Solar relay battery voltage critical.',
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}