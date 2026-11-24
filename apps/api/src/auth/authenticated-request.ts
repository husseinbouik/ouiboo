import type { UserRole } from '@ouiboo/types'

/**
 * #1020 (B1): the authenticated-request shape controllers actually use.
 *
 * `user` is populated by JwtStrategy.validate (id/userId/email/role +
 * agency tenant ids) or, on MFA-enrolment routes, by
 * MfaEnrollmentGuard (identity fields only) — hence only `userId` is
 * unconditional. `tenantId` is attached to the request itself by
 * TenantGuard. Controllers used to receive `@Req() req` untyped — the
 * single largest source of implicit-any in the API (138 sites).
 *
 * The interface is deliberately structural (not `Request & {...}`):
 * handlers touch only these members, and unit specs construct minimal
 * request stubs against it.
 */
export interface AuthenticatedUser {
  userId: string
  id?: string
  email?: string
  role?: UserRole
  agencyId?: string | null
  tenantId?: string | null
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser
  // TenantGuard assigns this only when a tenant is resolved, and only
  // ever a non-empty agency profile id.
  tenantId?: string
  // MfaEnrollmentGuard assigns this on the MFA enrolment routes (#418).
  mfaEnrollmentViaChallenge?: boolean
  headers?: Record<string, string | string[] | undefined>
  rawBody?: Buffer
  ip?: string
}
