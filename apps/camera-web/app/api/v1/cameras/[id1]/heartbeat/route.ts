import { NextResponse } from 'next/server';
import { HeartbeatPayloadSchema } from '@fire-monitoring/shared';
import { StreamProbeService } from '@/services/stream-probe.service';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const raw = await request.json();
  const parsed = HeartbeatPayloadSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, streamUrl } = parsed.data;
  const probeService = new StreamProbeService();

  // Critical Rule: Even when heartbeat reports ONLINE, validate HLS playlist separately
  const probeResult =
    status === 'ONLINE' && streamUrl
      ? await probeService.probeHlsStream(params.id, streamUrl)
      : {
          streamStatus: 'UNAVAILABLE' as const,
          streamPlayable: false,
          errorStatus: 'HARDWARE_FAULT' as const,
          errorMessage: 'Camera reported OFFLINE during heartbeat',
        };

  return NextResponse.json({
    cameraId: params.id,
    status,
    streamStatus: probeResult.streamStatus,
    streamPlayable: probeResult.streamPlayable,
    errorStatus: probeResult.errorStatus,
    errorMessage: probeResult.errorMessage,
    lastHeartbeatAt: new Date().toISOString(),
  });
}