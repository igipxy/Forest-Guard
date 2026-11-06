import { UserRole } from '@fire-monitoring/shared';
import { getServiceSupabase, isSupabaseConfigured } from './supabase';

export interface AuthenticatedContext {
  userId: string;
  role: UserRole;
  isDemoSession: boolean;
}

/**
 * Resolves the caller's role strictly from the server-verified Supabase JWT.
 * Never trusts raw X-User-Role headers in production.
 */
export async function resolveServerAuthContext(
  request: Request
): Promise<AuthenticatedContext> {
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (bearerToken && isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase.auth.getUser(bearerToken);
      if (!error && data?.user) {
        const jwtRole = data.user.app_metadata?.role;
        return {
          userId: data.user.id,
          role: jwtRole === 'ADMIN' ? 'ADMIN' : 'OPERATOR',
          isDemoSession: false,
        };
      }
    } catch {
      // Fall through to least-privilege OPERATOR
    }
  }

  // Only allow demo role switching when NEXT_PUBLIC_ENABLE_DEMO_MODE is explicitly enabled in non-production
  const isDemoModeAllowed =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';

  if (isDemoModeAllowed) {
    const demoRoleHeader = request.headers.get('X-Demo-Role');
    return {
      userId: 'demo-user',
      role: demoRoleHeader === 'ADMIN' ? 'ADMIN' : 'OPERATOR',
      isDemoSession: true,
    };
  }

  // Default to least-privilege OPERATOR
  return {
    userId: 'anonymous-operator',
    role: 'OPERATOR',
    isDemoSession: false,
  };
}