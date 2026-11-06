import { NextResponse } from 'next/server';
import { CameraSyncService } from '@/services/camera.service';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const cameraService = new CameraSyncService();
  const cameras = await cameraService.syncCamerasWithStreamValidation();
  return NextResponse.json({ cameras, syncedAt: new Date().toISOString() }, { status: 200 });
}
