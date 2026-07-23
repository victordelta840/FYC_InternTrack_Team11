import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';

/**
 * Deterministic key derivation from COOKIE_SECRET (32 bytes).
 * Used to encrypt template mapping_config JSON.
 */
function getKey(): Buffer {
  const secret = process.env.COOKIE_SECRET || 'insecure-cookie-secret-change-me-please';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptJson(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptJson<T = unknown>(payload: string): T {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString('utf8')) as T;
}
