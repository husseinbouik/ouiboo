import { UsersService } from './users.service';

describe('UsersService', () => {
    const privateFields = [
        'password',
        'passwordResetTokenHash',
        'passwordResetExpiresAt',
        'passwordResetSentAt',
        'otp',
        'otpExpiresAt',
        'otpLastSentAt',
    ];

    const userRecord = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'TRAVELER',
        password: 'hashed-password',
        passwordResetTokenHash: 'reset-token',
        passwordResetExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
        passwordResetSentAt: new Date('2026-01-01T00:00:00.000Z'),
        otp: '123456',
        otpExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
        otpLastSentAt: new Date('2026-01-01T00:00:00.000Z'),
        agencyProfile: null,
    };

    const createService = () => {
        const db = {
            user: {
                findUnique: jest.fn().mockResolvedValue(userRecord),
                update: jest.fn().mockResolvedValue({
                    ...userRecord,
                    name: 'Updated User',
                }),
            },
            agencyProfile: {
                upsert: jest.fn(),
            },
            notificationLog: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
            auditLog: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
            refreshToken: { deleteMany: jest.fn() },
            wishlist: { deleteMany: jest.fn() },
            notificationPreference: { deleteMany: jest.fn() },
            booking: { updateMany: jest.fn() },
            tripTemplate: { updateMany: jest.fn() },
            $transaction: jest.fn(async (callback) => callback(db)),
        };

        return {
            db,
            service: new UsersService(db as any),
        };
    };

    it('does not expose authentication secrets from getMe', async () => {
        const { service } = createService();

        const result = await service.getMe('user-1');

        privateFields.forEach((field) => {
            expect(result).not.toHaveProperty(field);
        });
        expect(result).toMatchObject({
            id: 'user-1',
            email: 'test@example.com',
            agencyProfile: null,
        });
    });

    it('does not expose authentication secrets after profile updates', async () => {
        const { service } = createService();

        const result = await service.updateUserProfile('user-1', {
            name: 'Updated User',
        });

        privateFields.forEach((field) => {
            expect(result).not.toHaveProperty(field);
        });
        expect(result).toMatchObject({
            id: 'user-1',
            name: 'Updated User',
        });
    });

    it('exports owned data without selecting authentication secrets', async () => {
        const { db, service } = createService();

        await service.exportUserData('user-1');

        expect(db.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1' },
            select: expect.not.objectContaining({ password: expect.anything() }),
        }));
    });

    it('revokes access and pseudonymizes the authenticated account', async () => {
        const { db, service } = createService();

        await service.deleteUserAccount('user-1');

        expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
        expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1' },
            data: expect.objectContaining({ isEmailVerified: false, name: null, avatar: null }),
        }));
    });
});
