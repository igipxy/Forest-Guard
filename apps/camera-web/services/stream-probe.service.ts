import {
  CameraErrorCode,
  IStreamProbeService,
  StreamProbeResult,
} from '@fire-monitoring/shared';

export class StreamProbeService implements IStreamProbeService {
  private readonly timeoutMs = Number(process.env.STREAM_PROBE_TIMEOUT_MS || 3500);

  async probeHlsStream(cameraId: string, streamUrl: string): Promise<StreamProbeResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorStatus: CameraErrorCode =
          response.status >= 500
            ? 'HTTP_500'
            : response.status === 401 || response.status === 403
            ? 'AUTH_ERROR'
            : 'STREAM_UNREACHABLE';

        return {
          cameraId,
          streamUrl,
          streamStatus: 'UNAVAILABLE',
          streamPlayable: false,
          httpStatus: response.status,
          hasExtM3uHeader: false,
          hasPlayableSegments: false,
          latencyMs,
          errorStatus,
          errorMessage: `HLS server returned HTTP ${response.status}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const body = (await response.text()).trim();
      const hasExtM3uHeader = body.startsWith('#EXTM3U');
      const hasPlayableSegments =
        body.includes('#EXTINF:') || body.includes('#EXT-X-STREAM-INF:');

      if (!hasExtM3uHeader || !hasPlayableSegments) {
        return {
          cameraId,
          streamUrl,
          streamStatus: 'UNAVAILABLE',
          streamPlayable: false,
          httpStatus: response.status,
          hasExtM3uHeader,
          hasPlayableSegments,
          latencyMs,
          errorStatus: !hasExtM3uHeader ? 'INVALID_MANIFEST' : 'SEGMENT_ERROR',
          errorMessage: !hasExtM3uHeader
            ? 'Missing #EXTM3U playlist header'
            : 'Playlist contains #EXTM3U header but zero playable media segments or variants',
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
        hasPlayableSegments: true,
        latencyMs,
        errorStatus: 'NONE',
        errorMessage: null,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timer);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      return {
        cameraId,
        streamUrl,
        streamStatus: 'UNAVAILABLE',
        streamPlayable: false,
        httpStatus: null,
        hasExtM3uHeader: false,
        hasPlayableSegments: false,
        latencyMs: Date.now() - start,
        errorStatus: isAbort ? 'TIMEOUT' : 'STREAM_UNREACHABLE',
        errorMessage: isAbort
          ? `HLS request timed out after ${this.timeoutMs}ms`
          : error instanceof Error
          ? error.message
          : 'HLS stream unreachable',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}