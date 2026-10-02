import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { DatabaseService } from '../database/database.service';
import { NotFoundException } from '@nestjs/common';

const mockTripTemplate = {
    id: 'trip-123',
    agencyId: 'agency-123',
    title: 'Test Trip',
    currency: 'MAD',
    _count: { sessions: 0 },
};

const mockDatabaseService = {
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

    describe('deleteTemplate', () => {
        it('should delete a template if owned by user', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.update.mockResolvedValue({ ...mockTripTemplate, status: 'ARCHIVED' });

            await service.deleteTemplate('trip-123', 'agency-123');

            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
            });
            expect(db.tripTemplate.update).toHaveBeenCalledWith({
                where: { id: 'trip-123' },
                data: { status: 'ARCHIVED' },
            });
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
                    category: 'Adventure',
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
                    category: 'Adventure',
                    agencyId: 'agency-123',
                }),
            }));
        });
    });
});
