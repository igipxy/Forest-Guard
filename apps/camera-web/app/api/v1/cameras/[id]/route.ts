import { NextResponse } from 'next/server';
import { CameraUpdateSchema } from '@fire-monitoring/shared';
import { verifyInternalApiKey } from '@/lib/m2m-auth';
import { CameraRegistryService } from '@/services/camera-registry.service';

const registry = new CameraRegistryService();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = verifyInternalApiKey(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: auth.reason }, { status: 401 });
  }

  const camera = await registry.getCameraById(params.id);
  if (!camera) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Camera not found' }, { status: 404 });
  }
  return NextResponse.json(camera);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = verifyInternalApiKey(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: auth.reason }, { status: 401 });
  }

  const raw: unknown = await request.json();
  const parsed = CameraUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await registry.updateCamera(params.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Camera not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = verifyInternalApiKey(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: auth.reason }, { status: 401 });
  }

  const deleted = await registry.deleteCamera(params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Camera not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id: params.id });
}