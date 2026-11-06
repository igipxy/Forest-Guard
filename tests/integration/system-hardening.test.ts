import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamProbeService } from '../../apps/camera-web/services/stream-probe.service';
import { CameraRegistryService } from '../../apps/camera-web/services/camera-registry.service';
import { NotificationService } from '../../apps/monitoring-dashboard/services/notification.service';
import { ReportService } from '../../apps/monitoring-dashboard/services/report.service';
import { SystemLogger } from '../../apps/monitoring-dashboard/lib/logger';

describe('HLS Stream Probe & Camera Heartbeat Expiration', () => {
  const probeService = new StreamProbeService();

  it('marks stream PLAYABLE only when HTTP 200 AND #EXTM3U AND media segments exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:6.000,\nseg0.ts',
      })
    );

    const res = await probeService.probeHlsStream('cam-01', 'https://camera.local/live.m3u8');
    expect(res.streamStatus).toBe('PLAYABLE');
    expect(res.streamPlayable).toBe(true);
    expect(res.hasExtM3uHeader).toBe(true);
    expect(res.hasPlayableSegments).toBe(true);
  });

  it('rejects empty #EXTM3U playlist that has zero segments or variants', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '#EXTM3U\n#EXT-X-ENDLIST',
      })
    );

    const res = await probeService.probeHlsStream('cam-01', 'https://camera.local/empty.m3u8');
    expect(res.streamStatus).toBe('UNAVAILABLE');
    expect(res.errorStatus).toBe('SEGMENT_ERROR');
  });

  it('maps HTTP 500 from HLS relay to HTTP_500 errorStatus', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Transcoder Error',
      })
    );

    const res = await probeService.probeHlsStream('cam-02', 'https://camera.local/err.m3u8');
    expect(res.streamStatus).toBe('UNAVAILABLE');
    expect(res.errorStatus).toBe('HTTP_500');
  });

  it('detects expired camera heartbeats older than 90 seconds', () => {
    const now = Date.now();
    const freshHeartbeat = new Date(now - 30_000).toISOString();
    const staleHeartbeat = new Date(now - 120_000).toISOString();

    expect(CameraRegistryService.isHeartbeatExpired(freshHeartbeat, now)).toBe(false);
    expect(CameraRegistryService.isHeartbeatExpired(staleHeartbeat, now)).toBe(true);
    expect(CameraRegistryService.isHeartbeatExpired(null, now)).toBe(true);
  });
});

describe('Alert Deduplication & Lifecycle State Machine', () => {
  const notificationService = new NotificationService();

  beforeEach(() => {
    NotificationService.clearInMemoryAlertsForTests();
  });

  it('deduplicates repeated alerts sharing the same dedupKey until RESOLVED', async () => {
    const first = await notificationService.createOrDeduplicateAlert({
      dedupKey: 'CAMERA_OFFLINE:cam-03',
      title: 'Camera Offline: CCTV-MLG-03',
      severity: 'CRITICAL',
      category: 'CAMERA',
      description: 'Heartbeat lost.',
      relatedCameraId: 'cam-03',
    });
    expect(first.wasDeduplicated).toBe(false);
    expect(first.alert.occurrenceCount).toBe(1);
    expect(first.alert.status).toBe('CREATED');

    // Second failure with same dedupKey increments occurrenceCount instead of creating a duplicate
    const second = await notificationService.createOrDeduplicateAlert({
      dedupKey: 'CAMERA_OFFLINE:cam-03',
      title: 'Camera Offline: CCTV-MLG-03',
      severity: 'CRITICAL',
      category: 'CAMERA',
      description: 'Heartbeat still lost (check #2).',
      relatedCameraId: 'cam-03',
    });
    expect(second.wasDeduplicated).toBe(true);
    expect(second.alert.id).toBe(first.alert.id);
    expect(second.alert.occurrenceCount).toBe(2);

    // Transition CREATED -> ACKNOWLEDGED -> RESOLVED
    const acked = await notificationService.transitionAlertStatus(
      first.alert.id,
      'ACKNOWLEDGED',
      'operator-01'
    );
    expect(acked?.status).toBe('ACKNOWLEDGED');
    expect(acked?.acknowledgedBy).toBe('operator-01');

    const resolved = await notificationService.transitionAlertStatus(
      first.alert.id,
      'RESOLVED',
      'operator-01'
    );
    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.resolvedAt).toBeTruthy();
  });
});

describe('Historical Report Period Enforcement & RBAC Log Redaction', () => {
  it('refuses to generate a report using current weather when requested date has no records', async () => {
    const reportService = new ReportService();
    await expect(
      reportService.generateReportForDate('2026-01-15', [])
    ).rejects.toThrow(/No historical weather records found for reporting period 2026-01-15/);
  });

  it('strips stackTrace for OPERATOR and retains it for ADMIN', () => {
    const rawLogs = [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        level: 'ERROR' as const,
        errorCategory: 'HTTP_500' as const,
        message: 'Database timeout',
        sourceService: 'CameraSyncService',
        stackTrace: 'Error: Database timeout\n    at CameraSyncService.sync (camera.service.ts:42)',
      },
    ];

    const operatorLogs = SystemLogger.sanitizeLogsForRole(rawLogs, 'OPERATOR');
    const adminLogs = SystemLogger.sanitizeLogsForRole(rawLogs, 'ADMIN');

    expect(operatorLogs[0]?.stackTrace).toBeUndefined();
    expect(adminLogs[0]?.stackTrace).toContain('camera.service.ts:42');
  });
});