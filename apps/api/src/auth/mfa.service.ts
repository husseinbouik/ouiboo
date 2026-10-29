import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as bcrypt from 'bcrypt';
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    randomInt,
} from 'crypto';

/**
 * #418 (Council P0-13): primitives for admin MFA and the break-glass
 * recovery path.
 *
 * - TOTP secrets are NEVER stored plaintext: they are encrypted with
 *   AES-256-GCM under MFA_ENCRYPTION_KEY before they touch the database.
 *   A missing/malformed key fails closed (500) instead of degrading to
 *   plaintext storage.
 * - Recovery codes and break-glass secrets are stored only as bcrypt
 *   hashes; the plaintext is returned exactly once, at creation.
 */

export const MFA_ISSUER = 'Ouiboo Admin';
/** TOTP step length (otplib default) — one step per 30 seconds. */
export const TOTP_STEP_SECONDS = 30;
export const MFA_RECOVERY_CODE_COUNT = 10;
export const BREAK_GLASS_DEFAULT_TTL_DAYS = 90;
export const BREAK_GLASS_MAX_TTL_DAYS = 365;

// Unambiguous character set (no 0/O, 1/I/L) for human-transcribed codes.
const HUMAN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomSecretGroups(groups: number, groupLength: number): string {
    // crypto.randomInt is unbiased (rejection sampling internally); a
    // modulo over random bytes would skew the distribution.
    const out: string[] = [];
    for (let g = 0; g < groups; g++) {
        let group = '';
        for (let i = 0; i < groupLength; i++) {
            group += HUMAN_CODE_ALPHABET[randomInt(HUMAN_CODE_ALPHABET.length)];
        }
        out.push(group);
    }
    return out.join('-');
}

/** Normalise a human-typed code: uppercase, strip dashes/spaces. */
export function normalizeHumanCode(code: string): string {
    return code.trim().toUpperCase().replace(/[-\s]/g, '');
}

@Injectable()
export class MfaService {
    private readonly logger = new Logger(MfaService.name);
    private encryptionKey: Buffer | null = null;

    constructor() {
        // ±1 step window tolerates normal authenticator clock drift.
        authenticator.options = { window: 1 };
    }

    // ------------------------------------------------------------------
    // TOTP secret encryption (AES-256-GCM, key from MFA_ENCRYPTION_KEY)
    // ------------------------------------------------------------------

    private getEncryptionKey(): Buffer {
        if (this.encryptionKey) return this.encryptionKey;
        const raw = process.env.MFA_ENCRYPTION_KEY?.trim();
        if (!raw) {
            throw new HttpException('MFA_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        let key: Buffer | null = null;
        if (/^[0-9a-fA-F]{64}$/.test(raw)) {
            key = Buffer.from(raw, 'hex');
        } else {
            const decoded = Buffer.from(raw, 'base64');
            if (decoded.length === 32) key = decoded;
        }
        if (!key || key.length !== 32) {
            this.logger.error('MFA_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64).');
            throw new HttpException('MFA_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        this.encryptionKey = key;
        return key;
    }

    encryptSecret(plaintext: string): string {
        const key = this.getEncryptionKey();
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
        const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return [
            'v1',
            iv.toString('base64'),
            tag.toString('base64'),
            ciphertext.toString('base64'),
        ].join('.');
    }

    decryptSecret(stored: string): string {
        const key = this.getEncryptionKey();
        const parts = stored.split('.');
        if (parts.length !== 4 || parts[0] !== 'v1') {
            throw new HttpException('MFA_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const [, ivB64, tagB64, ctB64] = parts;
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'), { authTagLength: 16 });
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ctB64, 'base64')),
            decipher.final(),
        ]);
        return plaintext.toString('utf8');
    }

    // ------------------------------------------------------------------
    // TOTP
    // ------------------------------------------------------------------

    generateTotpSecret(): string {
        return authenticator.generateSecret();
    }

    buildOtpAuthUrl(email: string, secret: string): string {
        return authenticator.keyuri(email, MFA_ISSUER, secret);
    }

    /** Current valid TOTP code for a secret (test/support helper). */
    generateTotpCode(secret: string): string {
        return authenticator.generate(secret);
    }

    verifyTotp(secret: string, code: string): boolean {
        const token = code.trim().replace(/\s/g, '');
        if (!/^\d{6}$/.test(token)) return false;
        try {
            return authenticator.verify({ token, secret });
        } catch {
            return false;
        }
    }

    /**
     * #642: like verifyTotp, but returns the absolute TOTP step the code
     * belongs to (steps are 30-second counters since the Unix epoch), or
     * null when the code does not verify inside the ±1 window. Callers
     * persist the returned step and refuse any later code at or below
     * it, which makes every code single-use without narrowing the
     * drift window.
     */
    verifyTotpStep(secret: string, code: string): number | null {
        const token = code.trim().replace(/\s/g, '');
        if (!/^\d{6}$/.test(token)) return null;
        try {
            const delta = authenticator.checkDelta(token, secret);
            if (delta === null) return null;
            const currentStep = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
            return currentStep + delta;
        } catch {
            return null;
        }
    }

    // ------------------------------------------------------------------
    // One-time codes (account recovery codes + break-glass secrets)
    // ------------------------------------------------------------------

    generateRecoveryCodes(count = MFA_RECOVERY_CODE_COUNT): string[] {
        return Array.from({ length: count }, () => randomSecretGroups(2, 4));
    }

    generateBreakGlassSecret(): string {
        return randomSecretGroups(4, 5);
    }

    async hashCode(code: string): Promise<string> {
        return bcrypt.hash(normalizeHumanCode(code), 10);
    }

    async hashCodes(codes: string[]): Promise<string[]> {
        return Promise.all(codes.map((code) => this.hashCode(code)));
    }

    /**
     * Find the index of the stored hash matching a candidate code, or -1.
     * The caller burns the matched hash (removes it) so codes are one-time.
     */
    async findMatchingCodeIndex(candidate: string, hashes: string[]): Promise<number> {
        const normalized = normalizeHumanCode(candidate);
        if (!normalized) return -1;
        for (let i = 0; i < hashes.length; i++) {
            if (await bcrypt.compare(normalized, hashes[i])) {
                return i;
            }
        }
        return -1;
    }
}
