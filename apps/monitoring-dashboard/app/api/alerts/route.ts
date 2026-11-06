import { NextResponse } from 'next/server';
import { NotificationService } from '@/services/notification.service';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { AlertRow } from '@fire-monitoring/shared';

const notificationService = new NotificationService();

export async function GET(): Promise<NextResponse> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        return NextResponse.json({ alerts: data as AlertRow[] }, { status: 200 });
      }
    } catch {
      // Fallback handled below
    }
  }
  return NextResponse.json({ alerts: [] }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      title: string;
      severity: 'INFO' | 'WARNING' | 'CRITICAL';
      category: 'FIRE_RISK' | 'WEATHER' | 'CAMERA' | 'SYSTEM_SYNC';
      description: string;
      location?: string;
      relatedCameraId?: string;
      dedupKey?: string;
    };

    const alert = await notificationService.createAlert(body);
    return NextResponse.json(alert, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: err instanceof Error ? err.message : 'Invalid alert payload' },
      { status: 400 }
    );
  }
}
