import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { DatabaseService } from '../database/database.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockTripTemplate = {
    id: 'trip-123',
    agencyId: 'agency-123',
    title: 'Test Trip',
};

const mockAgency = {
    id: 'agency-123',
    userId: 'user-123',
};

const mockDatabaseService = {
    agencyProfile: {
        findUnique: jest.fn(),
    },
    tripTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    tripSession: {
        create: jest.fn(),
        findMany: jest.fn(),
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
            db.agencyProfile.findUnique.mockResolvedValue(mockAgency);
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.update.mockResolvedValue({ ...mockTripTemplate, title: 'Updated' });

            const dto = { title: 'Updated' };
            await service.updateTemplate('trip-123', 'user-123', dto);

            expect(db.agencyProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
            });
            expect(db.tripTemplate.update).toHaveBeenCalled();
        });

        it('should throw error if user does not own the agency', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ ...mockAgency, id: 'agency-456' }); // Different agency
            db.tripTemplate.findFirst.mockResolvedValue(null); // No match for trip + new agency

            const dto = { title: 'Updated' };

            await expect(service.updateTemplate('trip-123', 'user-123', dto)).rejects.toThrow(NotFoundException);
        });

        it('should throw error if agency profile not found', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(null);
            await expect(service.updateTemplate('trip-123', 'user-999', {})).rejects.toThrow(ForbiddenException);
        });
    });

    describe('deleteTemplate', () => {
        it('should delete a template if owned by user', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(mockAgency);
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.delete.mockResolvedValue(mockTripTemplate);

            await service.deleteTemplate('trip-123', 'user-123');

            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
            });
            expect(db.tripTemplate.delete).toHaveBeenCalledWith({ where: { id: 'trip-123' } });
        });

        it('should throw error if unauthorized', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(mockAgency);
            db.tripTemplate.findFirst.mockResolvedValue(null); // Not found for this agency

            await expect(service.deleteTemplate('trip-123', 'user-123')).rejects.toThrow(NotFoundException);
        });
    });
});
