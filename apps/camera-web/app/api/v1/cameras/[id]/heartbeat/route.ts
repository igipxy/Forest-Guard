import { NextResponse } from 'next/server';
import { HeartbeatPayloadSchema } from '@fire-monitoring/shared';
import { verifyInternalApiKey } from '@/lib/m2m-auth';
import { CameraRegistryService } from '@/services/camera-registry.service';

const registry = new CameraRegistryService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = verifyInternalApiKey(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: auth.reason },
      { status: 401 }
    );
  }

  const raw: unknown = await request.json();
  const parsed = HeartbeatPayloadSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await registry.recordHeartbeat(
      params.id,
      parsed.data.status,
      parsed.data.streamUrl
    );
    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'HEARTBEAT_UPDATE_FAILED',
        message: err instanceof Error ? err.message : 'Failed to record heartbeat',
      },
      { status: 500 }
    );
  }
}