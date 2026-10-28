/**
 * #418 (Council P0-13) — AuthController MFA / break-glass endpoints.
 *
 * The controller's job is transport: pass DTO fields through to
 * AuthService, set the refresh cookie ONLY when tokens are actually
 * issued (never for an MFA challenge), and strip the refresh token
 * from response bodies.
 */
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController #418 endpoints', () => {
    const service = {
        validateUser: jest.fn(),
        beginLogin: jest.fn(),
        verifyMfa: jest.fn(),
        verifyMfaRecovery: jest.fn(),
        useBreakGlass: jest.fn(),
        startMfaEnrollment: jest.fn(),
        confirmMfaEnrollment: jest.fn(),
        getMfaStatus: jest.fn(),
        createBreakGlassCredential: jest.fn(),
        listBreakGlassCredentials: jest.fn(),
        revokeBreakGlassCredential: jest.fn(),
    };
    const controller = new AuthController(service as never);
    const mockRes = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as any;
    const adminReq = (viaChallenge = false) =>
        ({ user: { id: 'admin-1' }, mfaEnrollmentViaChallenge: viaChallenge }) as any;

    beforeEach(() => jest.clearAllMocks());

    it('returns an MFA challenge payload WITHOUT setting a refresh cookie', async () => {
        service.validateUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
        service.beginLogin.mockResolvedValue({ mfaRequired: true, challengeToken: 'ct-1' });
        const res = mockRes();
        const body = await controller.login({ email: 'a@b.c', password: 'pw' } as never, res);
        expect(body).toEqual({ mfaRequired: true, challengeToken: 'ct-1' });
        expect(res.cookie).not.toHaveBeenCalled();
    });

    it('sets the refresh cookie and strips the refresh token for a plain login', async () => {
        service.validateUser.mockResolvedValue({ id: 'trav-1', role: 'TRAVELER' });
        service.beginLogin.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', user: { id: 'trav-1' } });
        const res = mockRes();
        const body: any = await controller.login({ email: 'a@b.c', password: 'pw' } as never, res);
        expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'rt', expect.objectContaining({ httpOnly: true }));
        expect(body).toEqual({ accessToken: 'at', user: { id: 'trav-1' } });
    });

    it('rejects login when credentials do not validate', async () => {
        service.validateUser.mockResolvedValue(null);
        await expect(controller.login({ email: 'a@b.c', password: 'bad' } as never, mockRes()))
            .rejects.toBeInstanceOf(UnauthorizedException);
        expect(service.beginLogin).not.toHaveBeenCalled();
    });

    it('completes MFA verify / recovery / break-glass with cookie + stripped body', async () => {
        const tokens = { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1', role: 'ADMIN' } };
        service.verifyMfa.mockResolvedValue(tokens);
        service.verifyMfaRecovery.mockResolvedValue(tokens);
        service.useBreakGlass.mockResolvedValue({ ...tokens, usedBreakGlass: true });

        let res = mockRes();
        await expect(controller.verifyMfa({ challengeToken: 'ct', code: '123456' } as never, res))
            .resolves.toEqual({ accessToken: 'at', user: { id: 'admin-1', role: 'ADMIN' } });
        expect(service.verifyMfa).toHaveBeenCalledWith('ct', '123456');
        expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'rt', expect.anything());

        res = mockRes();
        await controller.verifyMfaRecovery({ challengeToken: 'ct', recoveryCode: 'AAAA-BBBB' } as never, res);
        expect(service.verifyMfaRecovery).toHaveBeenCalledWith('ct', 'AAAA-BBBB');
        expect(res.cookie).toHaveBeenCalled();

        res = mockRes();
        const body: any = await controller.breakGlass(
            { email: 'admin@ouiboo.local', password: 'pw', code: 'AAAAA-BBBBB' } as never, res);
        expect(service.useBreakGlass).toHaveBeenCalledWith('admin@ouiboo.local', 'pw', 'AAAAA-BBBBB');
        expect(body.usedBreakGlass).toBe(true);
        expect(body.refreshToken).toBeUndefined();
        expect(res.cookie).toHaveBeenCalled();
    });

    it('passes the via-challenge flag into enrolment start/confirm', async () => {
        service.startMfaEnrollment.mockResolvedValue({ otpauthUrl: 'otpauth://x', secret: 'S', expiresInSeconds: 600 });
        await controller.startMfaEnrollment({ password: 'pw' } as never, adminReq(false));
        expect(service.startMfaEnrollment).toHaveBeenCalledWith('admin-1', false, 'pw');
        await controller.startMfaEnrollment({} as never, adminReq(true));
        expect(service.startMfaEnrollment).toHaveBeenCalledWith('admin-1', true, undefined);

        service.confirmMfaEnrollment.mockResolvedValue({ recoveryCodes: ['AAAA-BBBB'] });
        const resNoTokens = mockRes();
        const codesOnly: any = await controller.confirmMfaEnrollment(
            { code: '123456' } as never, adminReq(false), resNoTokens);
        expect(codesOnly).toEqual({ recoveryCodes: ['AAAA-BBBB'] });
        expect(resNoTokens.cookie).not.toHaveBeenCalled();

        service.confirmMfaEnrollment.mockResolvedValue({
            recoveryCodes: ['AAAA-BBBB'], accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' },
        });
        const resTokens = mockRes();
        const withTokens: any = await controller.confirmMfaEnrollment(
            { code: '123456' } as never, adminReq(true), resTokens);
        expect(service.confirmMfaEnrollment).toHaveBeenCalledWith('admin-1', true, '123456');
        expect(withTokens.refreshToken).toBeUndefined();
        expect(resTokens.cookie).toHaveBeenCalledWith('refresh_token', 'rt', expect.anything());
    });

    it('delegates status and break-glass credential management with the actor id', async () => {
        service.getMfaStatus.mockResolvedValue({ mfaEnabled: true });
        await expect(controller.mfaStatus(adminReq())).resolves.toEqual({ mfaEnabled: true });
        expect(service.getMfaStatus).toHaveBeenCalledWith('admin-1');

        const dto = { label: 'Vault', password: 'pw', expiresInDays: 30 };
        service.createBreakGlassCredential.mockResolvedValue({ id: 'bg-1', secret: 'AAAAA' });
        await controller.createBreakGlassCredential(dto as never, adminReq());
        expect(service.createBreakGlassCredential).toHaveBeenCalledWith('admin-1', dto);

        service.listBreakGlassCredentials.mockResolvedValue([]);
        await controller.listBreakGlassCredentials(adminReq());
        expect(service.listBreakGlassCredentials).toHaveBeenCalledWith('admin-1');

        service.revokeBreakGlassCredential.mockResolvedValue({ id: 'bg-1', revoked: true });
        await controller.revokeBreakGlassCredential('bg-1', adminReq());
        expect(service.revokeBreakGlassCredential).toHaveBeenCalledWith('admin-1', 'bg-1');
    });
});
