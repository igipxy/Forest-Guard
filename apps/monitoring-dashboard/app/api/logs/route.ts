import { NextResponse } from 'next/server';
import { SystemLogger } from '@/lib/logger';
import { UserRole, SystemLogEntry } from '@fire-monitoring/shared';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleHeader = request.headers.get('X-User-Role') as UserRole | null;
  const role: UserRole = roleHeader === 'ADMIN' ? 'ADMIN' : 'OPERATOR';
  const levelFilter = searchParams.get('level');
  const serviceFilter = searchParams.get('service');

  let logs: SystemLogEntry[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (levelFilter && levelFilter !== 'ALL') query = query.eq('level', levelFilter);
      if (serviceFilter && serviceFilter !== 'ALL')
        query = query.eq('source_service', serviceFilter);

      const { data } = await query;
      if (data) {
        logs = data.map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          level: r.level,
          httpStatus: r.http_status,
          errorCategory: r.error_category,
          message: r.message,
          requestEndpoint: r.request_endpoint,
          requestMethod: r.request_method,
          sourceService: r.source_service,
          stackTrace: r.stack_trace,
        }));
      }
    } catch {
      // Fallback handled below
    }
  }

  // Strip stackTrace if caller is OPERATOR
  const sanitized = SystemLogger.sanitizeLogsForRole(logs, role);
  return NextResponse.json({ role, logs: sanitized });
}