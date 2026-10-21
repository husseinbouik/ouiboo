import { HttpException } from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { AuthService, ageInYears, CURRENT_TERMS_VERSION, MINIMUM_ACCOUNT_AGE } from './auth.service';

describe('ageInYears (#321)', () => {
    it('counts full years only', () => {
        const dob = new Date(2000, 5, 15);
        expect(ageInYears(dob, new Date(2018, 5, 14))).toBe(17);
        expect(ageInYears(dob, new Date(2018, 5, 15))).toBe(18);
        expect(ageInYears(dob, new Date(2018, 5, 16))).toBe(18);
    });
});

describe('AuthService register age gate (#321)', () => {
    const created: Array<Record<string, unknown>> = [];
    const db = {
        $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
            fn({
                user: {
                    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                        created.push(data);
                        return { id: 'user-1', ...data };
                    }),
                },
                agencyProfile: { create: jest.fn(async () => ({ id: 'agency-1' })) },
                wallet: { create: jest.fn(async () => ({})) },
            }),
        ),
    };
    const emailService = {
        getOTPTemplate: jest.fn().mockReturnValue('<html></html>'),
        sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
        db as never,
        {} as never,
        emailService as never,
        {} as never,
    );

    const baseDto = {
        email: 'gate@ouiboo.test',
        password: 'Password123!',
        name: 'Gate Test',
        role: UserRole.Traveler,
    };

    beforeEach(() => {
        created.length = 0;
        jest.clearAllMocks();
    });

    it('rejects an under-18 registration before any database write', async () => {
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        const error = await service
            .register({ ...baseDto, dateOfBirth: tenYearsAgo.toISOString().slice(0, 10) } as never)
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).message).toBe('AGE_RESTRICTED');
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(created).toHaveLength(0);
    });

    it('rejects a malformed date of birth', async () => {
        const error = await service
            .register({ ...baseDto, dateOfBirth: 'not-a-date' } as never)
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(HttpException);
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('registers an adult and records DOB, attestation time, and terms version', async () => {
        const result = await service.register({ ...baseDto, dateOfBirth: '1990-06-15' } as never);
        expect(result.email).toBe(baseDto.email);
        expect(created).toHaveLength(1);
        expect(created[0].dateOfBirth).toEqual(new Date('1990-06-15'));
        expect(created[0].ageAttestedAt).toBeInstanceOf(Date);
        expect(created[0].termsVersion).toBe(CURRENT_TERMS_VERSION);
    });

    it('keeps the minimum account age at 18', () => {
        expect(MINIMUM_ACCOUNT_AGE).toBe(18);
    });
});
