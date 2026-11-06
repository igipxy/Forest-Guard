import crypto from 'crypto';

export function verifyInternalApiKey(request: Request): {
  authorized: boolean;
  reason?: string;
} {
  const configuredSecret = process.env.CAMERA_API_SECRET;
  if (!configuredSecret || configuredSecret.trim().length < 16) {
    return {
      authorized: false,
      reason: 'Server misconfiguration: CAMERA_API_SECRET is missing or shorter than 16 chars',
    };
  }

  const providedKey = request.headers.get('X-Internal-Api-Key');
  if (!providedKey) {
    return { authorized: false, reason: 'Missing X-Internal-Api-Key header' };
  }

  const expectedBuf = Buffer.from(configuredSecret, 'utf8');
  const providedBuf = Buffer.from(providedKey, 'utf8');

  if (expectedBuf.length !== providedBuf.length) {
    return { authorized: false, reason: 'Invalid X-Internal-Api-Key' };
  }

  const match = crypto.timingSafeEqual(expectedBuf, providedBuf);
  return match ? { authorized: true } : { authorized: false, reason: 'Invalid X-Internal-Api-Key' };
}

export function sanitizeStreamUrlForClient(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
    }
    parsed.searchParams.forEach((_v, key) => {
      if (/token|key|secret|pass|auth/i.test(key)) {
        parsed.searchParams.set(key, 'REDACTED');
      }
    });
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}