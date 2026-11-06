import { NextResponse } from 'next/server';
import { CameraCreateSchema } from '@fire-monitoring/shared';
import { verifyInternalApiKey } from '@/lib/m2m-auth';
import { CameraRegistryService } from '@/services/camera-registry.service';

const registry = new CameraRegistryService();

export async function GET(request: Request): Promise<NextResponse> {
  const auth = verifyInternalApiKey(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: auth.reason },
      { status: 401 }
    );
  }

  const cameras = await registry.listCameras(true);
  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    cameras,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = verifyInternalApiKey(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: auth.reason },
      { status: 401 }
    );
  }

  const raw: unknown = await request.json();
  const parsed = CameraCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const created = await registry.registerCamera(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'CAMERA_CREATE_FAILED',
        message: err instanceof Error ? err.message : 'Failed to register camera',
      },
      { status: 500 }
    );
  }
}
