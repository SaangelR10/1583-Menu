type Bucket = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

/**
 * Defensa rapida por IP en memoria del proceso. En serverless (Vercel) no persiste entre
 * invocaciones/instancias, por eso el bloqueo *durable* real vive en Admin.failedAttempts/lockedUntil
 * (ver app/api/v1/admin/auth/login/route.ts). Esta capa solo absorbe rafagas dentro de la misma instancia.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { attempts: 0, firstAttemptAt: now, blockedUntil: null });
    return { allowed: true };
  }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }

  if (now - bucket.firstAttemptAt > WINDOW_MS) {
    bucket.attempts = 0;
    bucket.firstAttemptAt = now;
    bucket.blockedUntil = null;
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { attempts: 0, firstAttemptAt: now, blockedUntil: null };
  bucket.attempts += 1;
  if (bucket.attempts >= MAX_ATTEMPTS) {
    bucket.blockedUntil = now + BLOCK_MS;
  }
  buckets.set(key, bucket);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
