import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { DatabaseService } from '../database/database.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

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
});
