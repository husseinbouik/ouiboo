import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { GatewayEnablementService, GATEWAY_ENABLEMENT_AUDIT_ACTION, GATEWAY_ENABLEMENT_KEY } from './gateway-enablement.service';
import { PaymentsService } from './payments.service';
import { MfaService } from '../auth/mfa.service';

/**
 * #635 — the second gateway lock. Matrix under test:
 *   env ON  + setting OFF/absent -> gateway endpoints refuse (503)
 *   env OFF + setting ON         -> gateway endpoints refuse (503)
 *   env ON  + setting ON         -> flow proceeds to the provider stub
 * plus the admin + MFA step-up rules for changing the setting.
 */
describe('Gateway enablement — second lock (#635)', () => {
    const ORIGINAL_ENV = process.env.ENABLE_GATEWAY_PAYMENTS;

    afterEach(() => {
        if (ORIGINAL_ENV === undefined) delete process.env.ENABLE_GATEWAY_PAYMENTS;
        else process.env.ENABLE_GATEWAY_PAYMENTS = ORIGINAL_ENV;
    });

    function paymentsServiceWith(settingValue: string | null) {
        const provider = {
            initiatePayment: jest.fn().mockResolvedValue({
                sessionId: 'ps_stub',
                redirectUrl: 'https://stub.example/pay',
                expiresAt: new Date(),
                metadata: {},
            }),
        };
        const prisma: any = {
            platformSetting: {
                findUnique: jest.fn().mockResolvedValue(
                    settingValue === null ? null : { key: GATEWAY_ENABLEMENT_KEY, value: settingValue },
                ),
            },
            booking: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 'booking-1',
                    travelerId: 'traveler-1',
                    status: 'PENDING',
                    guestsCount: 1,
                    agencyId: 'agency-1',
                    traveler: { email: 't@example.com', name: 'T' },
                    session: { price: 100, currency: 'MAD' },
                }),
                update: jest.fn().mockResolvedValue({}),
            },
            paymentTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
        };
        const factory: any = { getProvider: jest.fn().mockReturnValue(provider) };
        const service = new PaymentsService(prisma, factory, {} as any, {} as any);
        return { service, provider, prisma };
    }

    const dto: any = {
        bookingId: 'booking-1',
        amount: 100,
        provider: 'stripe',
        travelerEmail: 't@example.com',
        travelerName: 'T',
    };

    it('env ON + setting OFF -> initiatePayment refuses with 503 and never reaches the provider', async () => {
        process.env.ENABLE_GATEWAY_PAYMENTS = 'true';
        const { service, provider } = paymentsServiceWith('false');
        await expect(service.initiatePayment(dto, 'traveler-1')).rejects.toThrow(ServiceUnavailableException);
        await expect(service.initiatePayment(dto, 'traveler-1')).rejects.toThrow('Gateway payments are not enabled');
        expect(provider.initiatePayment).not.toHaveBeenCalled();
    });

    it('env ON + setting ABSENT (default) -> initiatePayment refuses with 503', async () => {
        process.env.ENABLE_GATEWAY_PAYMENTS = 'true';
        const { service, provider } = paymentsServiceWith(null);
        await expect(service.initiatePayment(dto, 'traveler-1')).rejects.toThrow(ServiceUnavailableException);
        expect(provider.initiatePayment).not.toHaveBeenCalled();
    });

    it('env OFF + setting ON -> initiatePayment still refuses with 503', async () => {
        process.env.ENABLE_GATEWAY_PAYMENTS = 'false';
        const { service, provider } = paymentsServiceWith('true');
        await expect(service.initiatePayment(dto, 'traveler-1')).rejects.toThrow(ServiceUnavailableException);
        expect(provider.initiatePayment).not.toHaveBeenCalled();
    });

    it('env ON + setting ON -> flow proceeds to the provider stub', async () => {
        process.env.ENABLE_GATEWAY_PAYMENTS = 'true';
        const { service, provider } = paymentsServiceWith('true');
        const result: any = await service.initiatePayment(dto, 'traveler-1');
        expect(provider.initiatePayment).toHaveBeenCalledTimes(1);
        expect(result.redirectUrl).toBe('https://stub.example/pay');
    });

    describe('GatewayEnablementService.setEnabled (admin + MFA step-up)', () => {
        // Built at runtime: a 64-hex-char literal here trips secret scanning.
        const MFA_KEY = Buffer.alloc(32, 0x2a).toString('hex');
        let mfa: MfaService;
        let secret: string;
        let db: any;
        let service: GatewayEnablementService;

        function adminUser(overrides: Record<string, any> = {}) {
            return {
                id: 'admin-1',
                email: 'admin@ouiboo.test',
                role: 'ADMIN',
                mfaEnabled: true,
                mfaTotpSecret: mfa.encryptSecret(secret),
                mfaTotpLastAcceptedStep: null,
                ...overrides,
            };
        }

        beforeEach(() => {
            process.env.MFA_ENCRYPTION_KEY = MFA_KEY;
            mfa = new MfaService();
            secret = mfa.generateTotpSecret();
            db = {
                user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
                platformSetting: {
                    findUnique: jest.fn().mockResolvedValue(null),
                    upsert: jest.fn().mockResolvedValue({}),
                },
                auditLog: { create: jest.fn().mockResolvedValue({}) },
                $transaction: jest.fn(async (cb: any) => cb(db)),
            };
            service = new GatewayEnablementService(db, mfa);
        });

        it('rejects a non-admin actor', async () => {
            db.user.findUnique.mockResolvedValue(adminUser({ role: 'AGENCY' }));
            await expect(service.setEnabled({ id: 'admin-1' }, true, '123456')).rejects.toThrow(ForbiddenException);
            expect(db.platformSetting.upsert).not.toHaveBeenCalled();
        });

        it('rejects an admin without MFA enrolled', async () => {
            db.user.findUnique.mockResolvedValue(adminUser({ mfaEnabled: false, mfaTotpSecret: null }));
            await expect(service.setEnabled({ id: 'admin-1' }, true, '123456')).rejects.toThrow(ForbiddenException);
            expect(db.platformSetting.upsert).not.toHaveBeenCalled();
        });

        it('rejects a wrong TOTP code and writes nothing', async () => {
            db.user.findUnique.mockResolvedValue(adminUser());
            const good = mfa.generateTotpCode(secret);
            const wrong = good === '000000' ? '999999' : '000000';
            await expect(service.setEnabled({ id: 'admin-1' }, true, wrong)).rejects.toThrow(UnauthorizedException);
            expect(db.platformSetting.upsert).not.toHaveBeenCalled();
            expect(db.auditLog.create).not.toHaveBeenCalled();
        });

        it('rejects a replayed TOTP step', async () => {
            const code = mfa.generateTotpCode(secret);
            const step = mfa.verifyTotpStep(secret, code)!;
            db.user.findUnique.mockResolvedValue(adminUser({ mfaTotpLastAcceptedStep: step }));
            await expect(service.setEnabled({ id: 'admin-1' }, true, code)).rejects.toThrow(UnauthorizedException);
            expect(db.platformSetting.upsert).not.toHaveBeenCalled();
        });

        it('accepts a fresh TOTP code: upserts the setting, consumes the step, and audit-logs the change', async () => {
            db.user.findUnique.mockResolvedValue(adminUser());
            const code = mfa.generateTotpCode(secret);
            await service.setEnabled({ id: 'admin-1', email: 'admin@ouiboo.test' }, true, code);

            expect(db.platformSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { key: GATEWAY_ENABLEMENT_KEY },
                create: expect.objectContaining({ value: 'true', updatedById: 'admin-1' }),
                update: expect.objectContaining({ value: 'true' }),
            }));
            expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    actorId: 'admin-1',
                    action: GATEWAY_ENABLEMENT_AUDIT_ACTION,
                    targetType: 'PlatformSetting',
                    targetId: GATEWAY_ENABLEMENT_KEY,
                    metadata: expect.objectContaining({ enabled: true }),
                }),
            }));
            expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'admin-1' },
                data: expect.objectContaining({ mfaTotpLastAcceptedStep: expect.any(Number) }),
            }));
        });

        it('isGatewayEnabled requires both controls', async () => {
            process.env.ENABLE_GATEWAY_PAYMENTS = 'true';
            db.platformSetting.findUnique.mockResolvedValue({ key: GATEWAY_ENABLEMENT_KEY, value: 'false' });
            await expect(service.isGatewayEnabled()).resolves.toBe(false);
            db.platformSetting.findUnique.mockResolvedValue({ key: GATEWAY_ENABLEMENT_KEY, value: 'true' });
            await expect(service.isGatewayEnabled()).resolves.toBe(true);
            process.env.ENABLE_GATEWAY_PAYMENTS = 'false';
            await expect(service.isGatewayEnabled()).resolves.toBe(false);
        });

        it('fails closed when the setting cannot be read', async () => {
            process.env.ENABLE_GATEWAY_PAYMENTS = 'true';
            db.platformSetting.findUnique.mockRejectedValue(new Error('db down'));
            await expect(service.isGatewayEnabled()).resolves.toBe(false);
        });
    });
});
