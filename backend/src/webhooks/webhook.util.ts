import * as crypto from 'crypto';

/**
 * Deterministic HMAC-SHA256 signature.
 * Format sent as `X-Webhook-Signature: sha256=<hex>` header, matching
 * the convention used by Stripe, GitHub, and most webhook consumers.
 *
 * We also send `X-Webhook-Timestamp` to allow replay-attack detection.
 * Consumers should:
 *   1. Reject if |now - timestamp| > 300s.
 *   2. Compute HMAC over `timestamp.rawBody` using their secret, and
 *      compare in constant-time to the value in `X-Webhook-Signature`.
 */
export function signPayload(secret: string, timestamp: number, rawBody: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

export function verifySignature(
  secret: string,
  timestamp: number,
  rawBody: string,
  provided: string,
): boolean {
  const expected = signPayload(secret, timestamp, rawBody);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function newSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Truncated exponential backoff. */
export function backoffMs(attempt: number, baseMs = 5_000, maxMs = 30 * 60_000): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * baseMs);
  return exp + jitter;
}
