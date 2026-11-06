'use client';
import { useState } from 'react';
import { CameraDevice } from '@fire-monitoring/shared';

export function useCameraSync(initialCameras: CameraDevice[] = []) {
  const [cameras, setCameras] = useState<CameraDevice[]>(initialCameras);
  return { cameras, setCameras };
}
