import { SystemLogEntry, LogLevel, UserRole } from '@fire-monitoring/shared';
import { getServiceSupabase } from './supabase';

const SENSITIVE_PATTERNS = [
  /(Bearer\s+)[a-zA-Z0-9_\-\.]+/gi,
  /(api[_-]?key|secret|password|token)["'\s:=]+["']?[a-zA-Z0-9_\-\.]+["']?/gi,
];

function sanitizeText(input?: string): string | undefined {
  if (!input) return undefined;
  return SENSITIVE_PATTERNS.reduce(
    (acc, regex) => acc.replace(regex, '$1[REDACTED]'),
    input
  );
}

export class SystemLogger {
  static async log(entry: Omit<SystemLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const sanitizedMessage = sanitizeText(entry.message) || 'Unknown system error';
    const sanitizedStack = sanitizeText(entry.stackTrace);

    try {
      const supabase = getServiceSupabase();
      await supabase.from('system_logs').insert({
        level: entry.level,
        http_status: entry.httpStatus ?? null,
        error_category: entry.errorCategory,
        message: sanitizedMessage,
        request_endpoint: entry.requestEndpoint ?? null,
        request_method: entry.requestMethod ?? null,
        source_service: entry.sourceService,
        stack_trace: sanitizedStack ?? null,
      });
    } catch (dbErr) {
      // Fallback to stderr if database connection itself failed
      console.error('[CRITICAL_LOGGER_FALLBACK]', {
        originalError: sanitizedMessage,
        dbError: dbErr instanceof Error ? dbErr.message : 'Unknown DB failure',
      });
    }
  }

  static sanitizeLogsForRole(logs: SystemLogEntry[], role: UserRole): SystemLogEntry[] {
    if (role === 'ADMIN') return logs;
    return logs.map(({ stackTrace, ...safeLog }) => safeLog);
  }
}