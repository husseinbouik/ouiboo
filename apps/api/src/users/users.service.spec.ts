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

    describe('updateAgencyProfile licence handling (#371)', () => {
        const createLicenceService = (existing: any) => {
            const db = {
                agencyProfile: {
                    findUnique: jest.fn().mockResolvedValue(existing),
                    upsert: jest.fn().mockImplementation(async (args: any) => args),
                },
            };
            return { db, service: new UsersService(db as any) };
        };

        const baseProfile = {
            companyName: 'Atlas Adventures',
            ice: '123456789012345',
            patente: 'P1234567',
            rib: '123456789012345678901234',
        };

        it('moves a first licence submission to PENDING_REVIEW', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: '2028-05-31',
                licenceIssuedAt: '2024-03-15',
                licenceIssuingAuthority: 'Ministère du Tourisme',
                licenceDocumentKey: 'private/user-9/licence.pdf',
            });

            expect(db.agencyProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
                create: expect.objectContaining({
                    travelLicenceStatus: 'PENDING_REVIEW',
                    licenceVerifiedAt: null,
                    licenceExpiry: new Date('2028-05-31'),
                    // B4: issue data persisted for the seller block.
                    licenceIssuedAt: new Date('2024-03-15'),
                    licenceIssuingAuthority: 'Ministère du Tourisme',
                }),
            }));
        });

        it('keeps a licence submission without the issue data NOT_SUBMITTED (B4)', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: '2028-05-31',
                licenceDocumentKey: 'private/user-9/licence.pdf',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.travelLicenceStatus).toBe('NOT_SUBMITTED');
        });

        it('sends a legacy verified agency that supplies the issue data back to review (B4)', async () => {
            const { db, service } = createLicenceService({
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: new Date('2028-05-31'),
                licenceIssuedAt: null,
                licenceIssuingAuthority: null,
                travelLicenceStatus: 'VERIFIED',
                licenceDocumentKey: 'private/user-9/licence.pdf',
            });

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                licenceIssuedAt: '2024-03-15',
                licenceIssuingAuthority: 'Ministère du Tourisme',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.update.travelLicenceStatus).toBe('PENDING_REVIEW');
            expect(call.update.licenceVerifiedAt).toBeNull();
        });

        it('never lets an agency set its own licence status to VERIFIED', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: '2028-05-31',
                licenceIssuedAt: '2024-03-15',
                licenceIssuingAuthority: 'Ministère du Tourisme',
                licenceDocumentKey: 'private/user-9/licence.pdf',
                travelLicenceStatus: 'VERIFIED',
                licenceVerifiedAt: new Date(),
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.travelLicenceStatus).toBe('PENDING_REVIEW');
            expect(call.create.licenceVerifiedAt).toBeNull();
        });

        it('sends a changed licence on a verified agency back to review', async () => {
            const { db, service } = createLicenceService({
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: new Date('2028-05-31'),
                licenceIssuedAt: new Date('2024-03-15'),
                licenceIssuingAuthority: 'Ministère du Tourisme',
                travelLicenceStatus: 'VERIFIED',
                licenceDocumentKey: 'private/user-9/licence.pdf',
            });

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceNumber: 'AV-2026-9999',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.update.travelLicenceStatus).toBe('PENDING_REVIEW');
            expect(call.update.licenceVerifiedAt).toBeNull();
        });

        it('keeps VERIFIED status when licence details are unchanged', async () => {
            const { db, service } = createLicenceService({
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: new Date('2028-05-31'),
                travelLicenceStatus: 'VERIFIED',
            });

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: '2028-05-31',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.update).not.toHaveProperty('travelLicenceStatus');
        });

        it('withdraws the submission when the licence number is cleared', async () => {
            const { db, service } = createLicenceService({
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: null,
                travelLicenceStatus: 'PENDING_REVIEW',
            });

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceNumber: '',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.update.travelLicenceStatus).toBe('NOT_SUBMITTED');
        });
    });

    describe('updateAgencyProfile verification documents & insurance (#415)', () => {
        const createLicenceService = (existing: any) => {
            const db = {
                agencyProfile: {
                    findUnique: jest.fn().mockResolvedValue(existing),
                    upsert: jest.fn().mockImplementation(async (args: any) => args),
                },
            };
            return { db, service: new UsersService(db as any) };
        };

        const baseProfile = {
            companyName: 'Atlas Adventures',
            ice: '123456789012345',
            patente: 'P1234567',
            rib: '123456789012345678901234',
        };

        it('keeps an incomplete licence submission (no document) NOT_SUBMITTED', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: '2028-05-31',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.travelLicenceStatus).toBe('NOT_SUBMITTED');
        });

        it('rejects a licence document key outside the agency private folder', async () => {
            const { service } = createLicenceService(null);

            await expect(service.updateAgencyProfile('user-9', {
                ...baseProfile,
                licenceDocumentKey: 'private/someone-else/licence.pdf',
            })).rejects.toThrow(/must reference a private document/);

            await expect(service.updateAgencyProfile('user-9', {
                ...baseProfile,
                licenceDocumentKey: 'https://example.com/licence.pdf',
            })).rejects.toThrow(/must reference a private document/);
        });

        it('rejects an insurance certificate key outside the agency private folder', async () => {
            const { service } = createLicenceService(null);

            await expect(service.updateAgencyProfile('user-9', {
                ...baseProfile,
                insuranceCertificateKey: 'public/cert.pdf',
            })).rejects.toThrow(/must reference a private document/);
        });

        it('never lets an agency stamp its own Ministry check or pause marker', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                travelLicenceType: 'ODV',
                travelLicenceNumber: 'AV-2024-0187',
                licenceExpiry: '2028-05-31',
                licenceDocumentKey: 'private/user-9/licence.pdf',
                licenceMinistryCheckedAt: new Date(),
                licenceMinistryCheckedBy: 'admin-1',
                verificationPausedAt: new Date(),
            } as any);

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.licenceMinistryCheckedAt).toBeNull();
            expect(call.create.licenceMinistryCheckedBy).toBeNull();
            expect(call.create).not.toHaveProperty('verificationPausedAt');
        });

        it('moves a complete insurance submission to PENDING_REVIEW and converts dates', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                insuranceInsurer: 'AXA Assurance Maroc',
                insurancePolicyNumber: 'RC-2026-00421',
                insuranceInsuredName: 'Atlas Adventures SARL',
                insuranceValidFrom: '2026-01-01',
                insuranceExpiry: '2026-12-31',
                insuranceCoverageLimit: 1000000,
                insuranceCertificateKey: 'private/user-9/rc.pdf',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.insuranceStatus).toBe('PENDING_REVIEW');
            expect(call.create.insuranceVerifiedAt).toBeNull();
            expect(call.create.insuranceExpiry).toEqual(new Date('2026-12-31'));
            expect(call.create.insuranceValidFrom).toEqual(new Date('2026-01-01'));
        });

        it('keeps a partial insurance submission NOT_SUBMITTED', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                insuranceInsurer: 'AXA Assurance Maroc',
                insurancePolicyNumber: 'RC-2026-00421',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.insuranceStatus).toBe('NOT_SUBMITTED');
        });

        it('never lets an agency set its own insurance status to VERIFIED', async () => {
            const { db, service } = createLicenceService(null);

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                insuranceInsurer: 'AXA Assurance Maroc',
                insurancePolicyNumber: 'RC-2026-00421',
                insuranceInsuredName: 'Atlas Adventures SARL',
                insuranceExpiry: '2026-12-31',
                insuranceCertificateKey: 'private/user-9/rc.pdf',
                insuranceStatus: 'VERIFIED',
                insuranceVerifiedAt: new Date(),
            } as any);

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.create.insuranceStatus).toBe('PENDING_REVIEW');
            expect(call.create.insuranceVerifiedAt).toBeNull();
        });

        it('sends changed insurance on a verified agency back to review', async () => {
            const { db, service } = createLicenceService({
                insuranceInsurer: 'AXA Assurance Maroc',
                insurancePolicyNumber: 'RC-2026-00421',
                insuranceInsuredName: 'Atlas Adventures SARL',
                insuranceValidFrom: new Date('2026-01-01'),
                insuranceExpiry: new Date('2026-12-31'),
                insuranceCoverageLimit: 1000000,
                insuranceCertificateKey: 'private/user-9/rc.pdf',
                insuranceStatus: 'VERIFIED',
            });

            await service.updateAgencyProfile('user-9', {
                ...baseProfile,
                insurancePolicyNumber: 'RC-2027-99999',
            });

            const call = db.agencyProfile.upsert.mock.calls[0][0];
            expect(call.update.insuranceStatus).toBe('PENDING_REVIEW');
            expect(call.update.insuranceVerifiedAt).toBeNull();
        });
    });
});
