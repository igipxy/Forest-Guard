import { NextResponse } from 'next/server';
import { CameraSyncService } from '@/services/camera.service';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cameraService = new CameraSyncService();
  let streamUrl: string | undefined;

  try {
    const body = await request.json();
    streamUrl = body?.streamUrl;
  } catch {
    // Optional body
  }

  const probeResult = await cameraService.validateSingleCameraStream(
    params.id,
    streamUrl
  );

  return NextResponse.json(probeResult, { status: 200 });
}