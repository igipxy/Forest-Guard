import { NextResponse } from 'next/server';
import { CameraCreateSchema } from '@fire-monitoring/shared';
import { StreamProbeService } from '@/services/stream-probe.service';

function verifyInternalApiKey(request: Request): boolean {
  const configuredSecret = process.env.CAMERA_API_SECRET;
  if (!configuredSecret) return true; // Local dev fallback when secret is unset
  const headerKey = request.headers.get('X-Internal-Api-Key');
  return headerKey === configuredSecret;
}

export async function GET(request: Request) {
  if (!verifyInternalApiKey(request)) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid X-Internal-Api-Key header' },
      { status: 401 }
    );
  }

  // Returns camera inventory with separated operational status & stream status
  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    cameras: [
      {
        id: 'cam-01',
        name: 'Tower Alpha - North Pine Ridge',
        code: 'CCTV-MLG-01',
        location: 'Sector A - North Pine Ridge',
        status: 'ONLINE',
        streamStatus: 'PLAYABLE',
        streamPlayable: true,
        streamProtocol: 'HLS',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        isDemoStream: true,
        lastHeartbeatAt: new Date().toISOString(),
        lastConnectedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        errorStatus: 'NONE',
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}

export async function POST(request: Request) {
  if (!verifyInternalApiKey(request)) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid X-Internal-Api-Key header' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = CameraCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const probeService = new StreamProbeService();
  const probe =
    parsed.data.status === 'ONLINE'
      ? await probeService.probeHlsStream('new-cam', parsed.data.streamUrl)
      : null;

  const created = {
    id: `cam-${Date.now()}`,
    ...parsed.data,
    streamStatus:
      parsed.data.status === 'OFFLINE'
        ? 'UNAVAILABLE'
        : probe?.streamStatus ?? 'UNAVAILABLE',
    streamPlayable:
      parsed.data.status === 'OFFLINE' ? false : probe?.streamPlayable ?? false,
    lastHeartbeatAt: parsed.data.status === 'ONLINE' ? new Date().toISOString() : null,
    lastConnectedAt: parsed.data.status === 'ONLINE' ? new Date().toISOString() : null,
    errorStatus: probe?.errorStatus ?? 'NONE',
    errorMessage: probe?.errorMessage ?? null,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(created, { status: 201 });
}