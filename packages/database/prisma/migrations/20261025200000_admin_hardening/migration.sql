-- #418 (Council P0-13): admin identity hardening.
-- The admin account was a single env-seeded, password-only identity — the
-- total-compromise path. This migration adds the storage for:
--   * TOTP MFA on admin accounts: mfaEnabled flag, the TOTP secret stored
--     AES-256-GCM encrypted (never plaintext; key = MFA_ENCRYPTION_KEY),
--     bcrypt hashes of one-time recovery codes, and the enrolment stamp.
--   * A SEPARATE break-glass recovery path: BreakGlassCredential rows hold
--     bcrypt hashes of one-time, expiring, revocable recovery secrets that
--     are NOT codes on the admin account itself. A break-glass secret is
--     shown once at creation, held offline by the founder, and its use is
--     audit-logged (ADMIN_BREAK_GLASS_USED) and alerted by email.
-- Expand-contract: all changes are additive with safe defaults; existing
-- users keep mfaEnabled = false and log in exactly as before until they
-- enrol (enrolment becomes mandatory only when ADMIN_MFA_REQUIRED=true).
-- Rollback impact: dropping the new table/columns is safe only after the
-- application is rolled back first; leaving them in place is harmless.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaTotpSecret" TEXT,
ADD COLUMN     "mfaRecoveryCodeHashes" JSONB,
ADD COLUMN     "mfaEnrolledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BreakGlassCredential" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByEmail" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BreakGlassCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreakGlassCredential_createdById_idx" ON "BreakGlassCredential"("createdById");

-- CreateIndex
CREATE INDEX "BreakGlassCredential_expiresAt_idx" ON "BreakGlassCredential"("expiresAt");

-- AddForeignKey
ALTER TABLE "BreakGlassCredential" ADD CONSTRAINT "BreakGlassCredential_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
