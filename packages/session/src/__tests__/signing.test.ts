/**
 * Unit tests for @ouiboo/session signing primitives (#252).
 *
 * Covers: sign/verify roundtrip, expiry, tampering (payload + signature),
 * malformed tokens, missing secret, cross-secret rejection.
 *
 * Runs under Node's Web Crypto (Edge-compatible code path — no Node-only APIs).
 */
import { signSession, verifySession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '../signing';

const TEST_SECRET = 'test-session-secret-32-chars-min!!';

function base64UrlDecodeToJson(input: string): Record<string, unknown> {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

function base64UrlEncode(data: string): string {
  const bytes = new TextEncoder().encode(data);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('signSession / verifySession', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('roundtrips a valid payload', async () => {
    const exp = Math.floor(Date.now() / 1000) + 900;
    const token = await signSession({ sub: 'user-1', role: 'AGENCY', exp });
    const payload = await verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-1');
    expect(payload?.role).toBe('AGENCY');
    expect(payload?.exp).toBe(exp);
  });

  it('produces the expected token format: base64url(payload).base64url(signature)', async () => {
    const token = await signSession({ sub: 'u', role: 'R', exp: Math.floor(Date.now() / 1000) + 60 });
    expect(token.split('.')).toHaveLength(2);
    const [encoded] = token.split('.');
    const decoded = base64UrlDecodeToJson(encoded);
    expect(decoded.sub).toBe('u');
  });

  it('rejects an expired token (fail closed)', async () => {
    const expired = Math.floor(Date.now() / 1000) - 60;
    const token = await signSession({ sub: 'user-1', role: 'AGENCY', exp: expired });
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const token = await signSession({
      sub: 'user-1',
      role: 'AGENCY',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    const [encoded, signature] = token.split('.');
    const payload = base64UrlDecodeToJson(encoded);
    payload.role = 'ADMIN'; // attacker upgrades their own role
    const tampered = `${base64UrlEncode(JSON.stringify(payload))}.${signature}`;
    await expect(verifySession(tampered)).resolves.toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const token = await signSession({
      sub: 'user-1',
      role: 'AGENCY',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    const [encoded, signature] = token.split('.');
    const tamperedSig = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
    await expect(verifySession(`${encoded}.${tamperedSig}`)).resolves.toBeNull();
  });

  it('rejects tokens signed with a different secret', async () => {
    const token = await signSession({
      sub: 'user-1',
      role: 'AGENCY',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    process.env.SESSION_SECRET = 'a-completely-different-secret!!';
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it('rejects malformed tokens', async () => {
    await expect(verifySession('')).resolves.toBeNull();
    await expect(verifySession('no-dot-here')).resolves.toBeNull();
    await expect(verifySession('a.b.c')).resolves.toBeNull();
    await expect(verifySession('not-base64!!!.alsonotbase64!!!')).resolves.toBeNull();
  });

  it('rejects null/undefined/non-string tokens', async () => {
    await expect(verifySession(null)).resolves.toBeNull();
    await expect(verifySession(undefined)).resolves.toBeNull();
    // @ts-expect-error - intentional misuse for the fail-closed test
    await expect(verifySession(12345)).resolves.toBeNull();
  });

  it('rejects a token whose payload is missing required fields', async () => {
    // Sign a structurally-valid but semantically-invalid payload via raw token crafting:
    // sign a payload then tamper-decode path is covered above; here use a garbage payload
    // that still parses: {} (missing sub/role/exp)
    const garbage = `${base64UrlEncode(JSON.stringify({}))}.${base64UrlEncode('x'.repeat(32))}`;
    await expect(verifySession(garbage)).resolves.toBeNull();
  });

  it('signSession throws when SESSION_SECRET is missing (fail fast, #243)', async () => {
    delete process.env.SESSION_SECRET;
    await expect(
      signSession({ sub: 'u', role: 'R', exp: Math.floor(Date.now() / 1000) + 60 }),
    ).rejects.toThrow('SESSION_SECRET is not configured');
  });

  it('verifySession returns null when SESSION_SECRET is missing (fail closed)', async () => {
    const token = await signSession({
      sub: 'user-1',
      role: 'AGENCY',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    delete process.env.SESSION_SECRET;
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it('exposes the shared cookie constants', () => {
    expect(SESSION_COOKIE_NAME).toBe('ouiboo_session');
    expect(SESSION_MAX_AGE_SECONDS).toBe(15 * 60);
  });
});
