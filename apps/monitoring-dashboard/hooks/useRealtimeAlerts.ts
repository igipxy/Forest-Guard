'use client';
import { useState } from 'react';
import { SystemAlert } from '@fire-monitoring/shared';

export function useRealtimeAlerts(initialAlerts: SystemAlert[] = []) {
  const [alerts, setAlerts] = useState<SystemAlert[]>(initialAlerts);
  return { alerts, setAlerts };
}
