import {
  AlertCategory,
  AlertLifecycleStatus,
  AlertRow,
  AlertSeverity,
  SystemAlert,
} from '@fire-monitoring/shared';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { SystemLogger } from '@/lib/logger';

export interface CreateAlertInput {
  dedupKey: string;
  title: string;
  severity: AlertSeverity;
  category: AlertCategory;
  description: string;
  location?: string | null;
  relatedCameraId?: string | null;
}

export class NotificationService {
  private static inMemoryAlerts = new Map<string, SystemAlert>();

  /**
   * Backwards-compatible wrapper so callers using createAlert(...) work seamlessly
   * while still benefiting from deduplication.
   */
  async createAlert(
    input: Omit<CreateAlertInput, 'dedupKey'> & { dedupKey?: string }
  ): Promise<SystemAlert> {
    const resolvedDedupKey =
      input.dedupKey ??
      `${input.category}:${input.relatedCameraId ?? input.location ?? input.title}`;

    const result = await this.createOrDeduplicateAlert({
      ...input,
      dedupKey: resolvedDedupKey,
    });
    return result.alert;
  }

  /**
   * Primary alert creation method with active deduplication (CREATED / ACKNOWLEDGED).
   */
  async createOrDeduplicateAlert(input: CreateAlertInput): Promise<{
    alert: SystemAlert;
    wasDeduplicated: boolean;
  }> {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const supabase = getServiceSupabase();

        // 1. Check for an existing active alert with the same dedup_key
        const { data: existing } = await supabase
          .from('alerts')
          .select('*')
          .eq('dedup_key', input.dedupKey)
          .in('status', ['CREATED', 'ACKNOWLEDGED'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          const typedExisting = existing as AlertRow;
          const nextCount = Number(typedExisting.occurrence_count || 1) + 1;

          const { data: updated } = await supabase
            .from('alerts')
            .update({
              occurrence_count: nextCount,
              last_seen_at: nowIso,
              description: input.description,
              severity: input.severity,
            })
            .eq('id', typedExisting.id)
            .select('*')
            .single();

          return {
            alert: this.mapRowToAlert((updated as AlertRow | null) ?? typedExisting),
            wasDeduplicated: true,
          };
        }

        // 2. Insert new alert in CREATED state
        const { data: inserted, error } = await supabase
          .from('alerts')
          .insert({
            dedup_key: input.dedupKey,
            title: input.title,
            severity: input.severity,
            category: input.category,
            status: 'CREATED',
            occurrence_count: 1,
            last_seen_at: nowIso,
            description: input.description,
            location: input.location ?? null,
            related_camera_id: input.relatedCameraId ?? null,
          })
          .select('*')
          .single();

        if (error || !inserted) throw error;
        return {
          alert: this.mapRowToAlert(inserted as AlertRow),
          wasDeduplicated: false,
        };
      } catch (err: unknown) {
        await SystemLogger.log({
          level: 'ERROR',
          httpStatus: 500,
          errorCategory: 'DB_CONNECTION_ERROR',
          message: `Alert persistence error: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`,
          sourceService: 'NotificationService',
        });
      }
    }

    // In-memory deduplication fallback when running without Supabase
    const existingMem = Array.from(NotificationService.inMemoryAlerts.values()).find(
      (a: SystemAlert) =>
        a.dedupKey === input.dedupKey &&
        (a.status === 'CREATED' || a.status === 'ACKNOWLEDGED')
    );

    if (existingMem) {
      const updatedMem: SystemAlert = {
        ...existingMem,
        occurrenceCount: existingMem.occurrenceCount + 1,
        lastSeenAt: nowIso,
        description: input.description,
        severity: input.severity,
      };
      NotificationService.inMemoryAlerts.set(existingMem.id, updatedMem);
      return { alert: updatedMem, wasDeduplicated: true };
    }

    const createdMem: SystemAlert = {
      id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dedupKey: input.dedupKey,
      title: input.title,
      severity: input.severity,
      category: input.category,
      status: 'CREATED',
      occurrenceCount: 1,
      lastSeenAt: nowIso,
      description: input.description,
      location: input.location ?? null,
      relatedCameraId: input.relatedCameraId ?? null,
      isRead: false,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: nowIso,
    };
    NotificationService.inMemoryAlerts.set(createdMem.id, createdMem);

    if (
      process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_CHAT_ID &&
      createdMem.severity === 'CRITICAL'
    ) {
      await this.dispatchTelegramNotification(createdMem);
    }

    return { alert: createdMem, wasDeduplicated: false };
  }

  async transitionAlertStatus(
    alertId: string,
    nextStatus: Extract<AlertLifecycleStatus, 'ACKNOWLEDGED' | 'RESOLVED'>,
    actorId: string
  ): Promise<SystemAlert | null> {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const updatePayload =
        nextStatus === 'ACKNOWLEDGED'
          ? {
              status: 'ACKNOWLEDGED',
              is_read: true,
              acknowledged: true,
              acknowledged_by: actorId,
              acknowledged_at: nowIso,
            }
          : {
              status: 'RESOLVED',
              is_read: true,
              resolved_at: nowIso,
            };

      const { data, error } = await supabase
        .from('alerts')
        .update(updatePayload)
        .eq('id', alertId)
        .select('*')
        .single();

      if (error || !data) return null;
      return this.mapRowToAlert(data as AlertRow);
    }

    const existing = NotificationService.inMemoryAlerts.get(alertId);
    if (!existing) return null;

    const updated: SystemAlert = {
      ...existing,
      status: nextStatus,
      isRead: true,
      acknowledged: nextStatus === 'ACKNOWLEDGED' ? true : existing.acknowledged,
      acknowledgedBy: nextStatus === 'ACKNOWLEDGED' ? actorId : existing.acknowledgedBy,
      acknowledgedAt: nextStatus === 'ACKNOWLEDGED' ? nowIso : existing.acknowledgedAt,
      resolvedAt: nextStatus === 'RESOLVED' ? nowIso : existing.resolvedAt,
    };
    NotificationService.inMemoryAlerts.set(alertId, updated);
    return updated;
  }

  public static clearInMemoryAlertsForTests(): void {
    NotificationService.inMemoryAlerts.clear();
  }

  private async dispatchTelegramNotification(alert: SystemAlert): Promise<void> {
    const endpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `[${alert.severity}] ${alert.title}\n${alert.description}`,
        }),
      });
    } catch {
      await SystemLogger.log({
        level: 'WARN',
        errorCategory: 'BACKGROUND_JOB_FAILURE',
        message: 'Failed to dispatch Telegram notification webhook',
        sourceService: 'NotificationService',
      });
    }
  }

  private mapRowToAlert(row: AlertRow): SystemAlert {
    return {
      id: String(row.id),
      dedupKey: String(row.dedup_key ?? row.id),
      title: String(row.title),
      severity: row.severity,
      category: row.category,
      status: row.status ?? (row.acknowledged ? 'ACKNOWLEDGED' : 'CREATED'),
      occurrenceCount: Number(row.occurrence_count || 1),
      lastSeenAt: row.last_seen_at || row.created_at,
      description: String(row.description),
      location: row.location,
      relatedCameraId: row.related_camera_id,
      isRead: Boolean(row.is_read),
      acknowledged: Boolean(row.acknowledged),
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at ?? null,
      createdAt: row.created_at,
    };
  }
}