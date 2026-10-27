import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { DatabaseService } from '../database/database.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

const mockTripTemplate = {
    id: 'trip-123',
    agencyId: 'agency-123',
    title: 'Test Trip',
    currency: 'MAD',
    status: 'DRAFT',
    _count: { sessions: 0 },
};

const mockDatabaseService = {
    $transaction: jest.fn((fn: any) => fn({
        itineraryDay: { deleteMany: jest.fn().mockResolvedValue({}) },
        review: { deleteMany: jest.fn().mockResolvedValue({}) },
        tripTemplate: { delete: jest.fn().mockResolvedValue({}) },
    })),
    tripTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    tripSession: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
    },
    booking: {
        count: jest.fn().mockResolvedValue(0),
    },
    agencyProfile: {
        findUnique: jest.fn(),
    },
};

describe('TripsService', () => {
    let service: TripsService;
    let db: typeof mockDatabaseService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripsService,
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
            ],
        }).compile();

        service = module.get<TripsService>(TripsService);
        db = module.get(DatabaseService);

        jest.clearAllMocks();
    });

    describe('updateTemplate', () => {
        it('should update a template if user owns the agency', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.update.mockResolvedValue({ ...mockTripTemplate, title: 'Updated' });

            const dto = { title: 'Updated' };
            await service.updateTemplate('trip-123', 'agency-123', dto);

            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
                include: { _count: { select: { sessions: true } } },
            });
            expect(db.tripTemplate.update).toHaveBeenCalled();
        });

        it('should throw error if user does not own the agency', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue(null); // No match for trip + new agency

            const dto = { title: 'Updated' };

            await expect(service.updateTemplate('trip-123', 'user-123', dto)).rejects.toThrow(NotFoundException);
        });

        it('should throw error if agency profile not found', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(null);
            await expect(service.updateTemplate('trip-123', 'user-999', {})).rejects.toThrow(NotFoundException);
        });
    });

    describe('imageAlts normalization (#332)', () => {
        beforeEach(() => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.create.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.update.mockResolvedValue(mockTripTemplate);
        });

        it('aligns alt texts to images on create (trim, pad missing)', async () => {
            await service.createTemplate('agency-123', {
                title: 'T',
                images: ['a.jpg', 'b.jpg'],
                imageAlts: ['  Sunrise hike  '],
            } as any);
            const arg = db.tripTemplate.create.mock.calls[0][0];
            expect(arg.data.imageAlts).toEqual(['Sunrise hike', '']);
        });

        it('drops extra alt texts and caps length at 300 on create', async () => {
            await service.createTemplate('agency-123', {
                title: 'T',
                images: ['a.jpg'],
                imageAlts: ['x'.repeat(350), 'extra'],
            } as any);
            const arg = db.tripTemplate.create.mock.calls[0][0];
            expect(arg.data.imageAlts).toEqual(['x'.repeat(300)]);
        });

        it('leaves imageAlts undefined when none are supplied', async () => {
            await service.createTemplate('agency-123', {
                title: 'T',
                images: ['a.jpg'],
            } as any);
            const arg = db.tripTemplate.create.mock.calls[0][0];
            expect(arg.data.imageAlts).toBeUndefined();
        });

        it('aligns alt texts to the existing images on update when images are unchanged', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                images: ['a.jpg', 'b.jpg', 'c.jpg'],
            });
            await service.updateTemplate('trip-123', 'agency-123', {
                imageAlts: ['Alt A'],
            } as any);
            const arg = db.tripTemplate.update.mock.calls[0][0];
            expect(arg.data.imageAlts).toEqual(['Alt A', '', '']);
        });
    });

    describe('cancellation scale (#417)', () => {
        beforeEach(() => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.create.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.update.mockResolvedValue(mockTripTemplate);
        });

        it('validates and normalizes agency bands on create (sorted, versioned)', async () => {
            await service.createTemplate('agency-123', {
                title: 'T',
                images: ['a.jpg'],
                cancellationPolicy: {
                    bands: [
                        { minDaysBeforeStart: 0, refundPercent: 10 },
                        { minDaysBeforeStart: 14, refundPercent: 80 },
                    ],
                },
            } as any);
            const arg = db.tripTemplate.create.mock.calls[0][0];
            expect(arg.data.cancellationPolicy).toEqual({
                version: 'cancellation-v1',
                bands: [
                    { minDaysBeforeStart: 14, refundPercent: 80 },
                    { minDaysBeforeStart: 0, refundPercent: 10 },
                ],
            });
        });

        it('rejects bands without 0-day coverage on create', async () => {
            await expect(
                service.createTemplate('agency-123', {
                    title: 'T',
                    images: ['a.jpg'],
                    cancellationPolicy: { bands: [{ minDaysBeforeStart: 7, refundPercent: 50 }] },
                } as any),
            ).rejects.toThrow('0 days');
            expect(db.tripTemplate.create).not.toHaveBeenCalled();
        });

        it('rejects duplicate band thresholds on update', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, images: ['a.jpg'] });
            await expect(
                service.updateTemplate('trip-123', 'agency-123', {
                    cancellationPolicy: {
                        bands: [
                            { minDaysBeforeStart: 0, refundPercent: 10 },
                            { minDaysBeforeStart: 0, refundPercent: 20 },
                        ],
                    },
                } as any),
            ).rejects.toThrow('Duplicate');
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('leaves the stored policy untouched when update omits it', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, images: ['a.jpg'] });
            await service.updateTemplate('trip-123', 'agency-123', { title: 'New' } as any);
            const arg = db.tripTemplate.update.mock.calls[0][0];
            expect(arg.data.cancellationPolicy).toBeUndefined();
        });

        it('resolves the platform default scale on the public detail when the trip has none', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                cancellationPolicy: null,
                agency: {
                    id: 'agency-123',
                    companyName: 'Atlas Adventures SARL',
                    logo: null,
                    verificationStatus: 'VERIFIED',
                    bankDetails: null,
                    bankDetailsStatus: 'VERIFIED',
                    bankDetailsVerifiedAt: new Date(),
                },
            });
            const result = await service.findOneTemplate('trip-123');
            expect((result as any).cancellationScale.floorRefundPercent).toBe(100);
            expect((result as any).cancellationScale.refundInitiationDays).toBe(7);
            expect((result as any).cancellationScale.bands[0]).toEqual({
                minDaysBeforeStart: 30,
                refundPercent: 100,
            });
        });

        it('resolves the agency bands on the public detail when stored', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                cancellationPolicy: {
                    version: 'cancellation-v1',
                    bands: [
                        { minDaysBeforeStart: 0, refundPercent: 10 },
                        { minDaysBeforeStart: 14, refundPercent: 80 },
                    ],
                },
                agency: {
                    id: 'agency-123',
                    companyName: 'Atlas Adventures SARL',
                    logo: null,
                    verificationStatus: 'VERIFIED',
                    bankDetails: null,
                    bankDetailsStatus: 'VERIFIED',
                    bankDetailsVerifiedAt: new Date(),
                },
            });
            const result = await service.findOneTemplate('trip-123');
            expect((result as any).cancellationScale.bands).toEqual([
                { minDaysBeforeStart: 14, refundPercent: 80 },
                { minDaysBeforeStart: 0, refundPercent: 10 },
            ]);
        });
    });

    describe('deleteTemplate', () => {
        it('should delete a draft template if owned by user', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);

            await service.deleteTemplate('trip-123', 'agency-123');

            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
            });
            // Drafts are hard-deleted via transaction (not archived)
            expect(db.$transaction).toHaveBeenCalled();
        });

        it('should throw ConflictException for non-draft templates', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'PUBLISHED' });

            await expect(service.deleteTemplate('trip-123', 'agency-123')).rejects.toThrow(ConflictException);
        });

        it('should throw error if unauthorized', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue(null); // Not found for this agency

            await expect(service.deleteTemplate('trip-123', 'user-123')).rejects.toThrow(NotFoundException);
        });
    });

    describe('archiveTemplate (#412)', () => {
        it('excludes fully refunded bookings from the active-booking block', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'ACTIVE' });
            // The count query itself carries the exclusion, so a trip
            // whose bookings all completed a full refund counts 0
            // active bookings and archives.
            db.booking.count.mockResolvedValue(0);
            db.tripTemplate.update.mockResolvedValue({ ...mockTripTemplate, status: 'ARCHIVED' });

            const result = await service.archiveTemplate('trip-123', 'agency-123');

            expect(result.status).toBe('ARCHIVED');
            const countWhere = db.booking.count.mock.calls[0][0].where;
            expect(countWhere.session).toEqual({ templateId: 'trip-123' });
            expect(countWhere.status.in).toEqual(['PENDING', 'AWAITING_VALIDATION', 'CONFIRMED']);
            expect(countWhere.paymentStatus).toEqual({ not: 'REFUNDED' });
        });

        it('still blocks archiving while a non-refunded active booking exists', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'ACTIVE' });
            db.booking.count.mockResolvedValue(1);

            await expect(service.archiveTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(ConflictException);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });
    });

    describe('findAllTemplates', () => {
        it('should pass q, category, and agencyId filters into the trip query', async () => {
            db.tripTemplate.findMany.mockResolvedValue([]);
            db.tripTemplate.count.mockResolvedValue(0);

            await service.findAllTemplates({
                q: 'atlas',
                category: 'Adventure',
                agencyId: 'agency-123',
                status: 'ACTIVE',
            });

            expect(db.tripTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    status: 'ACTIVE',
                    category: 'ADVENTURE',
                    agencyId: 'agency-123',
                    OR: [
                        { title: { contains: 'atlas', mode: 'insensitive' } },
                        { description: { contains: 'atlas', mode: 'insensitive' } },
                        { startLocation: { contains: 'atlas', mode: 'insensitive' } },
                    ],
                }),
            }));
            expect(db.tripTemplate.count).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    category: 'ADVENTURE',
                    agencyId: 'agency-123',
                }),
            }));
        });
    });

    describe('findOneTemplate agency bankDetails (#380)', () => {
        it('selects agency.bankDetails and returns it in the trip detail', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                agency: {
                    id: 'agency-123',
                    companyName: 'Atlas Adventures SARL',
                    logo: null,
                    verificationStatus: 'VERIFIED',
                    bankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
                    // #421: only an admin-verified destination is exposed.
                    bankDetailsStatus: 'VERIFIED',
                    bankDetailsVerifiedAt: new Date('2026-10-20T00:00:00Z'),
                },
            });

            const result = await service.findOneTemplate('trip-123');

            expect(db.tripTemplate.findFirst).toHaveBeenCalled();
            const args = db.tripTemplate.findFirst.mock.calls[0][0];
            // Checkout computes hasBankDetails from trip.agency.bankDetails and
            // blocks every booking when it is missing; if it is dropped from
            // the select again, checkout is permanently blocked (#380).
            expect(args.select.agency.select.bankDetails).toBe(true);
            expect((result as any).agency.bankDetails).toBe(
                'CIH Bank — RIB 230 780 0000000000000001 67',
            );
        });

        it('strips bankDetails when the destination is not admin-verified (#421)', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                agency: {
                    id: 'agency-123',
                    companyName: 'Atlas Adventures SARL',
                    logo: null,
                    verificationStatus: 'VERIFIED',
                    bankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
                    bankDetailsStatus: 'PENDING_REVIEW',
                    bankDetailsVerifiedAt: null,
                },
            });

            const result = await service.findOneTemplate('trip-123');

            expect((result as any).agency.bankDetails).toBeNull();
        });

        it('keeps the verified instructions live during a replacement review (#421)', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                agency: {
                    id: 'agency-123',
                    companyName: 'Atlas Adventures SARL',
                    logo: null,
                    verificationStatus: 'VERIFIED',
                    bankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
                    bankDetailsStatus: 'PENDING_REVIEW',
                    bankDetailsVerifiedAt: new Date('2026-10-20T00:00:00Z'),
                },
            });

            const result = await service.findOneTemplate('trip-123');

            expect((result as any).agency.bankDetails).toBe(
                'CIH Bank — RIB 230 780 0000000000000001 67',
            );
        });

        it('throws NotFoundException when the template does not exist', async () => {
            db.tripTemplate.findFirst.mockResolvedValue(null);

            await expect(service.findOneTemplate('trip-999')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAllTemplates public catalog gate (#317)', () => {
        it('restricts the public catalog to VERIFIED agencies and selects agency.verificationStatus', async () => {
            db.tripTemplate.findMany.mockResolvedValue([]);
            db.tripTemplate.count.mockResolvedValue(0);

            await service.findAllTemplates({});

            expect(db.tripTemplate.findMany).toHaveBeenCalled();
            const args = db.tripTemplate.findMany.mock.calls[0][0];
            // Anonymous catalog must never include pending/rejected/suspended agencies (#182, #317)
            expect(args.where.status).toBe('ACTIVE');
            expect(args.where.agency).toEqual({ verificationStatus: 'VERIFIED' });
            // The traveler card derives its verified badge from this field; if it
            // is dropped from the select again, every card is mislabeled (#317).
            expect(args.include.agency.select.verificationStatus).toBe(true);
        });
    });
    describe('session staged-payment configuration (#369)', () => {
        const future = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        beforeEach(() => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue({ id: 'trip-123', currency: 'MAD' });
            db.tripSession.create.mockImplementation(async ({ data }: any) => ({ id: 'session-new', ...data }));
            db.tripSession.aggregate.mockResolvedValue({ _min: { price: null } });
            db.tripTemplate.update.mockResolvedValue({});
        });

        it('persists minBookings, deadline and PENDING_MINIMUM for a staged session', async () => {
            const deadline = future(20);
            await service.createSession('agency-123', 'trip-123', {
                startDate: future(30),
                endDate: future(34),
                price: 1000,
                deposit: 200,
                totalSeats: 12,
                minBookings: 6,
                confirmationDeadline: deadline,
            } as any);

            const data = db.tripSession.create.mock.calls[0][0].data;
            expect(data.minBookings).toBe(6);
            expect(data.groupStatus).toBe('PENDING_MINIMUM');
            expect(data.confirmationDeadline).toEqual(new Date(deadline));
        });

        it('rejects a deposit above the 30% platform cap for minimum-group trips', async () => {
            await expect(service.createSession('agency-123', 'trip-123', {
                startDate: future(30),
                endDate: future(34),
                price: 1000,
                deposit: 900,
                totalSeats: 12,
                minBookings: 6,
                confirmationDeadline: future(20),
            } as any)).rejects.toThrow('cannot exceed 30%');
            expect(db.tripSession.create).not.toHaveBeenCalled();
        });

        it('rejects a staged session without a confirmation deadline', async () => {
            await expect(service.createSession('agency-123', 'trip-123', {
                startDate: future(30),
                endDate: future(34),
                price: 1000,
                deposit: 200,
                totalSeats: 12,
                minBookings: 6,
            } as any)).rejects.toThrow('confirmation deadline is required');
        });

        it('keeps non-staged sessions NOT_REQUIRED even with a large deposit', async () => {
            await service.createSession('agency-123', 'trip-123', {
                startDate: future(30),
                endDate: future(34),
                price: 1000,
                deposit: 900,
                totalSeats: 12,
            } as any);

            const data = db.tripSession.create.mock.calls[0][0].data;
            expect(data.minBookings).toBe(1);
            expect(data.groupStatus).toBe('NOT_REQUIRED');
            expect(data.confirmationDeadline).toBeNull();
        });
    });

    describe('publish gate: identity + travel licence (#371)', () => {
        const verifiedAgency = {
            id: 'agency-123',
            verificationStatus: 'VERIFIED',
            travelLicenceStatus: 'VERIFIED',
            licenceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            travelLicenceType: 'ODV',
            insuranceStatus: 'VERIFIED',
            insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };

        beforeEach(() => {
            db.tripTemplate.update.mockResolvedValue({ ...mockTripTemplate, status: 'ACTIVE' });
        });

        it('blocks re-activation when the travel licence was never submitted', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                travelLicenceStatus: 'NOT_SUBMITTED',
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(ForbiddenException);
            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(/licence must be submitted and verified/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('blocks re-activation when identity is not verified, even with a verified licence', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                verificationStatus: 'PENDING',
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(/identity must be verified/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('blocks re-activation when the licence has expired', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                licenceExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(/licence has expired/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('blocks re-activation when RC insurance was never submitted (#415)', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                insuranceStatus: 'NOT_SUBMITTED',
                insuranceExpiry: null,
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(/insurance must be submitted and verified/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('blocks re-activation when RC insurance has expired (#415)', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                insuranceExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(/insurance has expired/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('blocks re-activation for a DV agency even when fully verified (#415)', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                travelLicenceType: 'DV',
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            await expect(service.activateTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(/distributor \(DV\) licence does not permit organising/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('allows re-activation for a verified agency with a verified licence', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(verifiedAgency);
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'INACTIVE' });

            const result = await service.activateTemplate('trip-123', 'agency-123');

            expect(db.tripTemplate.update).toHaveBeenCalledWith({
                where: { id: 'trip-123' },
                data: { status: 'ACTIVE' },
            });
            expect(result.status).toBe('ACTIVE');
        });

        it('blocks restore of an archived trip when the licence is rejected', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                travelLicenceStatus: 'REJECTED',
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'ARCHIVED' });

            await expect(service.restoreTemplate('trip-123', 'agency-123'))
                .rejects.toThrow(ForbiddenException);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('blocks a PATCH transition into ACTIVE without a verified licence', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                ...verifiedAgency,
                travelLicenceStatus: 'PENDING_REVIEW',
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'DRAFT' });

            await expect(service.updateTemplate('trip-123', 'agency-123', { status: 'ACTIVE' } as any))
                .rejects.toThrow(/licence must be submitted and verified/i);
            expect(db.tripTemplate.update).not.toHaveBeenCalled();
        });

        it('does not gate edits that keep an already-ACTIVE trip active', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                id: 'agency-123',
                verificationStatus: 'VERIFIED',
                travelLicenceStatus: 'NOT_SUBMITTED',
                licenceExpiry: null,
            });
            db.tripTemplate.findFirst.mockResolvedValue({ ...mockTripTemplate, status: 'ACTIVE' });

            await service.updateTemplate('trip-123', 'agency-123', { title: 'Renamed' } as any);

            expect(db.tripTemplate.update).toHaveBeenCalled();
        });

        it('selects the seller licence fields in the trip detail (#371)', async () => {
            db.tripTemplate.findFirst.mockResolvedValue({
                ...mockTripTemplate,
                agency: {
                    id: 'agency-123',
                    companyName: 'Atlas Adventures SARL',
                    legalName: 'Atlas Adventures SARL',
                    travelLicenceNumber: 'AV-2024-0187',
                    travelLicenceStatus: 'VERIFIED',
                },
            });

            await service.findOneTemplate('trip-123');

            const args = db.tripTemplate.findFirst.mock.calls[0][0];
            expect(args.select.agency.select.legalName).toBe(true);
            expect(args.select.agency.select.travelLicenceNumber).toBe(true);
            expect(args.select.agency.select.travelLicenceStatus).toBe(true);
            expect(args.select.agency.select.licenceExpiry).toBe(true);
        });
    });

    describe('DV organise block at template creation (#415)', () => {
        beforeEach(() => {
            db.tripTemplate.create.mockResolvedValue(mockTripTemplate);
        });

        it('blocks a DV agency from creating a trip template', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                id: 'agency-123',
                travelLicenceType: 'DV',
            });

            await expect(service.createTemplate('agency-123', { title: 'T' } as any))
                .rejects.toThrow(/distributor \(DV\) licence does not permit organising/i);
            expect(db.tripTemplate.create).not.toHaveBeenCalled();
        });

        it('allows an ODV agency to create a trip template', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                id: 'agency-123',
                travelLicenceType: 'ODV',
            });

            const result = await service.createTemplate('agency-123', { title: 'T' } as any);

            expect(db.tripTemplate.create).toHaveBeenCalled();
            expect(result.id).toBe('trip-123');
        });

        it('allows an agency with no licence type submitted yet to draft', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({
                id: 'agency-123',
                travelLicenceType: null,
            });

            await service.createTemplate('agency-123', { title: 'T' } as any);

            expect(db.tripTemplate.create).toHaveBeenCalled();
        });
    });
});
