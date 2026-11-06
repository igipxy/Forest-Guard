import { NextResponse } from 'next/server';
import { SystemLogger } from '@/lib/logger';
import { resolveServerAuthContext } from '@/lib/auth';
import { SystemLogEntry, SystemLogRow } from '@fire-monitoring/shared';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const authContext = await resolveServerAuthContext(request);
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

      if (levelFilter && levelFilter !== 'ALL') {
        query = query.eq('level', levelFilter);
      }
      if (serviceFilter && serviceFilter !== 'ALL') {
        query = query.eq('source_service', serviceFilter);
      }

      const { data } = await query;
      if (data) {
        const typedRows = data as SystemLogRow[];
        logs = typedRows.map(
          (r: SystemLogRow): SystemLogEntry => ({
            id: r.id,
            timestamp: r.timestamp,
            level: r.level,
            httpStatus: r.http_status,
            errorCategory: r.error_category,
            message: r.message,
            requestEndpoint: r.request_endpoint,
            requestMethod: r.request_method,
            sourceService: r.source_service,
            metadata: r.metadata,
            stackTrace: r.stack_trace,
          })
        );
      }
    } catch {
      // Fallback empty array if DB unreachable
    }
  }

  const sanitized = SystemLogger.sanitizeLogsForRole(logs, authContext.role);
  return NextResponse.json({ role: authContext.role, logs: sanitized });
}