/**
 * BFF session cookie signing/verification (#208).
 *
 * The API's refresh_token cookie is HttpOnly and scoped to the API domain,
 * so Next.js proxies on separate app domains can never see it. Instead, each
 * app maintains its own signed session cookie (`ouiboo_session`) after login.
 *
 * Uses HMAC-SHA256 via Web Crypto (Edge runtime compatible).
 * Fail closed: any verification error returns null.
 */

export interface SessionPayload {
  sub: string;
  role: string;
  exp: number; // Unix seconds
}

export const SESSION_COOKIE_NAME = 'ouiboo_session';
export const SESSION_MAX_AGE_SECONDS = 15 * 60; // 15 minutes, matches access token lifetime

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * Creates a signed session token. Format: base64url(payload).base64url(signature)
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSign(encoded, getSecret());
  return `${encoded}.${signature}`;
}

/**
 * Verifies a session token. Returns the payload if valid and not expired, null otherwise.
 * Fail closed: any error (bad signature, expired, malformed) returns null.
 */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    const expected = await hmacSign(encoded, getSecret());
    // Constant-time comparison
    const a = new TextEncoder().encode(signature);
    const b = new TextEncoder().encode(expected);
    if (a.length !== b.length) return null;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    if (diff !== 0) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as SessionPayload;
    if (!payload.sub || !payload.role || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null; // expired

    return payload;
  } catch {
    return null;
  }
}
