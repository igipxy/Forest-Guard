import {
  CameraDevice,
  CameraErrorCode,
  CameraRow,
  StreamStatus,
} from '@fire-monitoring/shared';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { StreamProbeService } from './stream-probe.service';
import { sanitizeStreamUrlForClient } from '@/lib/m2m-auth';

export const HEARTBEAT_TTL_MS = 90_000;

export interface CameraSseEvent {
  type:
    | 'CAMERA_REGISTERED'
    | 'CAMERA_STATUS_UPDATED'
    | 'CAMERA_HEARTBEAT_EXPIRED'
    | 'CAMERA_DELETED';
  camera: CameraDevice;
  timestamp: string;
}

type SseListener = (event: CameraSseEvent) => void;

class CameraEventEmitter {
  private listeners = new Set<SseListener>();

  subscribe(listener: SseListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(type: CameraSseEvent['type'], camera: CameraDevice): void {
    const payload: CameraSseEvent = {
      type,
      camera: { ...camera, streamUrl: sanitizeStreamUrlForClient(camera.streamUrl) },
      timestamp: new Date().toISOString(),
    };
    this.listeners.forEach((listener: SseListener) => listener(payload));
  }
}

export const cameraEventBus = new CameraEventEmitter();

export class CameraRegistryService {
  private readonly probeService = new StreamProbeService();

  public static isHeartbeatExpired(
    lastHeartbeatAt: string | null,
    nowMs: number = Date.now()
  ): boolean {
    if (!lastHeartbeatAt) return true;
    const elapsed = nowMs - new Date(lastHeartbeatAt).getTime();
    return elapsed > HEARTBEAT_TTL_MS;
  }

  async listCameras(includeDemoWhenEmpty = false): Promise<CameraDevice[]> {
    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data) {
        const typedRows = data as CameraRow[];
        const nowMs = Date.now();
        return await Promise.all(
          typedRows.map(async (row: CameraRow): Promise<CameraDevice> => {
            const expired =
              row.status === 'ONLINE' &&
              CameraRegistryService.isHeartbeatExpired(row.last_heartbeat_at, nowMs);

            if (expired) {
              const { data: updated } = await supabase
                .from('cameras')
                .update({
                  status: 'OFFLINE',
                  stream_status: 'UNAVAILABLE',
                  stream_playable: false,
                  error_status: 'HEARTBEAT_EXPIRED',
                  error_message: 'Camera heartbeat expired (>90s without telemetry).',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', row.id)
                .select('*')
                .single();

              const mapped = this.mapRowToCamera((updated as CameraRow | null) ?? row);
              cameraEventBus.emit('CAMERA_HEARTBEAT_EXPIRED', mapped);
              return mapped;
            }

            return this.mapRowToCamera(row);
          })
        );
      }
    }

    return includeDemoWhenEmpty ? this.getExplicitlyLabeledDemoCameras() : [];
  }

  async getCameraById(cameraId: string): Promise<CameraDevice | null> {
    if (!isSupabaseConfigured()) return null;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('id', cameraId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToCamera(data as CameraRow);
  }

  async updateCamera(
    cameraId: string,
    patch: Partial<{
      name: string;
      location: string;
      status: 'ONLINE' | 'OFFLINE';
      streamUrl: string;
      streamStatus: StreamStatus;
      errorStatus: CameraErrorCode;
      errorMessage: string | null;
    }>
  ): Promise<CameraDevice | null> {
    if (!isSupabaseConfigured()) return null;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('cameras')
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.streamUrl !== undefined ? { stream_url: patch.streamUrl } : {}),
        ...(patch.streamStatus !== undefined ? { stream_status: patch.streamStatus } : {}),
        ...(patch.errorStatus !== undefined ? { error_status: patch.errorStatus } : {}),
        ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cameraId)
      .select('*')
      .single();

    if (error || !data) return null;
    const updated = this.mapRowToCamera(data as CameraRow);
    cameraEventBus.emit('CAMERA_STATUS_UPDATED', updated);
    return updated;
  }

  async deleteCamera(cameraId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const existing = await this.getCameraById(cameraId);
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('cameras').delete().eq('id', cameraId);
    if (error) return false;
    if (existing) {
      cameraEventBus.emit('CAMERA_DELETED', existing);
    }
    return true;
  }

  // ... registerCamera and recordHeartbeat preserved with CameraRow typing ...
  private mapRowToCamera(row: CameraRow): CameraDevice {
    return {
      id: String(row.id),
      name: String(row.name),
      code: String(row.code),
      location: String(row.location),
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
      status: row.status,
      streamStatus: row.stream_status,
      streamPlayable: Boolean(row.stream_playable),
      streamProtocol: row.stream_protocol,
      streamUrl: String(row.stream_url),
      isDemoStream: Boolean(row.is_demo_stream),
      lastHeartbeatAt: row.last_heartbeat_at,
      lastConnectedAt: row.last_connected_at,
      errorStatus: row.error_status,
      errorMessage: row.error_message,
      updatedAt: row.updated_at,
    };
  }

  private getExplicitlyLabeledDemoCameras(): CameraDevice[] {
    const now = Date.now();
    return [
      {
        id: 'demo-cam-01',
        name: '[DEMO] Tower Alpha - North Pine Ridge',
        code: 'DEMO-MLG-01',
        location: 'Sector A - North Pine Ridge',
        status: 'ONLINE',
        streamStatus: 'PLAYABLE',
        streamPlayable: true,
        streamProtocol: 'HLS',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        isDemoStream: true,
        lastHeartbeatAt: new Date(now - 10_000).toISOString(),
        lastConnectedAt: new Date(now - 3600_000).toISOString(),
        errorStatus: 'NONE',
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}