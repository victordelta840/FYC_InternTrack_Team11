import { signPayload, verifySignature, newSecret, backoffMs } from './webhook.util';

describe('signPayload', () => {
  it('is deterministic for the same secret + timestamp + body', () => {
    const s1 = signPayload('secret-a', 1706000000, '{"event":"x"}');
    const s2 = signPayload('secret-a', 1706000000, '{"event":"x"}');
    expect(s1).toBe(s2);
    expect(s1).toMatch(/^[0-9a-f]{64}$/); // sha256 hex length
  });

  it('changes when the secret changes', () => {
    const s1 = signPayload('secret-a', 1706000000, '{"event":"x"}');
    const s2 = signPayload('secret-b', 1706000000, '{"event":"x"}');
    expect(s1).not.toBe(s2);
  });

  it('changes when the body changes', () => {
    const s1 = signPayload('s', 1706000000, '{"event":"x"}');
    const s2 = signPayload('s', 1706000000, '{"event":"y"}');
    expect(s1).not.toBe(s2);
  });

  it('changes when the timestamp changes (replay protection)', () => {
    const s1 = signPayload('s', 1706000000, '{}');
    const s2 = signPayload('s', 1706000001, '{}');
    expect(s1).not.toBe(s2);
  });
});

describe('verifySignature', () => {
  it('accepts a valid signature', () => {
    const body = '{"x":1}';
    const sig = signPayload('shh', 100, body);
    expect(verifySignature('shh', 100, body, sig)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    expect(verifySignature('shh', 100, '{}', 'a'.repeat(64))).toBe(false);
  });

  it('rejects when body was tampered', () => {
    const sig = signPayload('shh', 100, '{"a":1}');
    expect(verifySignature('shh', 100, '{"a":2}', sig)).toBe(false);
  });
});

describe('newSecret', () => {
  it('returns a base64url string of reasonable length', () => {
    const s = newSecret(32);
    expect(s.length).toBeGreaterThanOrEqual(40);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('backoffMs', () => {
  it('grows exponentially with attempts', () => {
    const a1 = backoffMs(1, 1000, 60_000);
    const a5 = backoffMs(5, 1000, 60_000);
    expect(a5).toBeGreaterThan(a1);
  });

  it('caps at maxMs', () => {
    const capped = backoffMs(20, 1000, 5000);
    // base cap 5000 + jitter up to 1000 → never exceeds 6000
    expect(capped).toBeLessThanOrEqual(6000);
  });
});
