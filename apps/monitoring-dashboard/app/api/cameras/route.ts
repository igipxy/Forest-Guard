import { NextResponse } from 'next/server';
import { CameraSyncService } from '@/services/camera.service';

export async function GET(): Promise<NextResponse> {
  const cameraService = new CameraSyncService();
  const cameras = await cameraService.syncCamerasWithStreamValidation();
  return NextResponse.json({ cameras, syncedAt: new Date().toISOString() }, { status: 200 });
}
