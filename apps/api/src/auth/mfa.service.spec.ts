/**
 * #418 (Council P0-13) — MfaService primitives.
 *
 * The properties that matter for admin identity hardening:
 * - TOTP secrets are encrypted at rest (AES-256-GCM) and a missing or
 *   wrong key fails closed instead of falling back to plaintext.
 * - TOTP verification accepts the current code (and ±1 step of drift) and
 *   rejects everything else.
 * - Recovery codes / break-glass secrets are bcrypt-hashed, matched
 *   case/dash-insensitively, and match exactly once per stored hash.
 */
import { authenticator } from 'otplib';
import { MfaService, normalizeHumanCode, TOTP_STEP_SECONDS } from './mfa.service';

const TEST_KEY_HEX = 'a1'.repeat(32); // 64 hex chars = 32 bytes

describe('MfaService (#418)', () => {
    let service: MfaService;

    beforeEach(() => {
        process.env.MFA_ENCRYPTION_KEY = TEST_KEY_HEX;
        service = new MfaService();
    });

    afterEach(() => {
        delete process.env.MFA_ENCRYPTION_KEY;
    });

    describe('secret encryption', () => {
        it('round-trips a TOTP secret and never stores plaintext', () => {
            const secret = service.generateTotpSecret();
            const encrypted = service.encryptSecret(secret);
            expect(encrypted).not.toContain(secret);
            expect(encrypted.startsWith('v1.')).toBe(true);
            expect(service.decryptSecret(encrypted)).toBe(secret);
        });

        it('fails closed when MFA_ENCRYPTION_KEY is missing', () => {
            delete process.env.MFA_ENCRYPTION_KEY;
            expect(() => service.encryptSecret('anything')).toThrow('MFA_NOT_CONFIGURED');
        });

        it('fails closed on a tampered ciphertext', () => {
            const encrypted = service.encryptSecret('JBSWY3DPEHPK3PXP');
            const parts = encrypted.split('.');
            parts[3] = Buffer.from('tampered-value').toString('base64');
            expect(() => service.decryptSecret(parts.join('.'))).toThrow();
        });
    });

    describe('secret encryption edge cases', () => {
        it('rejects a malformed stored secret instead of returning garbage', () => {
            expect(() => service.decryptSecret('not-a-valid-payload')).toThrow();
            expect(() => service.decryptSecret('v2.aaaa.bbbb.cccc')).toThrow();
        });

        it('accepts the encryption key in base64 form as well as hex', () => {
            const previous = process.env.MFA_ENCRYPTION_KEY;
            process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
            try {
                const svc = new MfaService();
                const encrypted = svc.encryptSecret('JBSWY3DPEHPK3PXP');
                expect(svc.decryptSecret(encrypted)).toBe('JBSWY3DPEHPK3PXP');
            } finally {
                process.env.MFA_ENCRYPTION_KEY = previous;
            }
        });
    });

    describe('TOTP', () => {
        it('verifies the current code and rejects a wrong code', () => {
            const secret = service.generateTotpSecret();
            const code = service.generateTotpCode(secret);
            expect(service.verifyTotp(secret, code)).toBe(true);
            const wrong = code === '000000' ? '111111' : '000000';
            expect(service.verifyTotp(secret, wrong)).toBe(false);
        });

        it('rejects malformed codes without throwing', () => {
            const secret = service.generateTotpSecret();
            expect(service.verifyTotp(secret, 'abcdef')).toBe(false);
            expect(service.verifyTotp(secret, '12345')).toBe(false);
            expect(service.verifyTotp(secret, '')).toBe(false);
        });

        it('verifyTotpStep returns the absolute step of the matched code (#642)', () => {
            const secret = service.generateTotpSecret();
            const code = service.generateTotpCode(secret);
            const before = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
            const step = service.verifyTotpStep(secret, code);
            const after = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
            expect(step).not.toBeNull();
            expect([before, after]).toContain(step);
        });

        it('verifyTotpStep identifies a previous-step code inside the window (#642)', () => {
            const secret = service.generateTotpSecret();
            const currentStep = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
            authenticator.options = { window: 1, epoch: ((currentStep - 1) * TOTP_STEP_SECONDS + 15) * 1000 };
            let prevCode: string;
            try {
                prevCode = service.generateTotpCode(secret);
            } finally {
                // See auth.service.mfa.spec: reset the merged epoch.
                authenticator.resetOptions();
                authenticator.options = { window: 1 };
            }
            expect(service.verifyTotpStep(secret, prevCode)).toBe(currentStep - 1);
        });

        it('verifyTotpStep returns null for wrong and malformed codes (#642)', () => {
            const secret = service.generateTotpSecret();
            const code = service.generateTotpCode(secret);
            const wrong = code === '000000' ? '111111' : '000000';
            expect(service.verifyTotpStep(secret, wrong)).toBeNull();
            expect(service.verifyTotpStep(secret, 'abcdef')).toBeNull();
            expect(service.verifyTotpStep(secret, '')).toBeNull();
        });

        it('builds an otpauth:// URL carrying the issuer and account', () => {
            const secret = service.generateTotpSecret();
            const url = service.buildOtpAuthUrl('admin@ouiboo.local', secret);
            expect(url.startsWith('otpauth://totp/')).toBe(true);
            expect(url).toContain(encodeURIComponent('Ouiboo Admin'));
            expect(url).toContain(secret);
        });
    });

    describe('one-time codes', () => {
        it('generates the requested number of formatted recovery codes', () => {
            const codes = service.generateRecoveryCodes(10);
            expect(codes).toHaveLength(10);
            for (const code of codes) {
                expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
            }
        });

        it('generates a 4-group break-glass secret', () => {
            const secret = service.generateBreakGlassSecret();
            expect(secret).toMatch(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
        });

        it('matches a stored hash case/dash-insensitively and only at its index', async () => {
            const codes = service.generateRecoveryCodes(3);
            const hashes = await service.hashCodes(codes);
            const messy = ` ${codes[1].toLowerCase().replace('-', ' ')} `;
            expect(normalizeHumanCode(messy)).toBe(codes[1].replace('-', ''));
            await expect(service.findMatchingCodeIndex(messy, hashes)).resolves.toBe(1);
            await expect(service.findMatchingCodeIndex('ZZZZ-9999', hashes)).resolves.toBe(-1);
        });
    });
});
