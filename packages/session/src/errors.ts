/**
 * Stable error codes for BFF session diagnostics (#247, #252).
 *
 * Kept byte-for-byte behavior-identical to the per-app session routes:
 *   SESSION_MALFORMED      (400) - missing/invalid request body
 *   SESSION_INVALID_TOKEN  (401) - API rejected the token
 *   SESSION_ROLE_MISMATCH  (403) - token valid but role not allowed on this portal (#257)
 *   SESSION_UPSTREAM_ERROR (502) - API validation unreachable (network/timeout)
 *   SESSION_CONFIG_ERROR   (500) - SESSION_SECRET missing or invalid
 */
import { NextResponse } from 'next/server';

export type SessionErrorCode =
  | 'SESSION_MALFORMED'
  | 'SESSION_INVALID_TOKEN'
  | 'SESSION_ROLE_MISMATCH'
  | 'SESSION_UPSTREAM_ERROR'
  | 'SESSION_CONFIG_ERROR';

export function sessionError(code: SessionErrorCode, status: number, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

/**
 * Safe diagnostic logging (#247): error category + timestamp only.
 * NEVER log tokens, cookies, passwords, or request bodies.
 */
export function logSessionError(code: SessionErrorCode, context: string) {
  console.error(`[session:${code}] ${context} at=${new Date().toISOString()}`);
}
