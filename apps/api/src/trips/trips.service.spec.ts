import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { DatabaseService } from '../database/database.service';

const mockTripTemplate = {
    id: 'trip-123',
    agencyId: 'agency-123',
    title: 'Test Trip',
};

const mockDatabaseService = {
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
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.update.mockResolvedValue({ ...mockTripTemplate, title: 'Updated' });

            const dto = { title: 'Updated' };
            await service.updateTemplate('trip-123', 'agency-123', dto);

            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
            });
            expect(db.tripTemplate.update).toHaveBeenCalled();
        });

        it('should throw error if user does not own the agency', async () => {
            db.tripTemplate.findFirst.mockResolvedValue(null); // No match for trip + new agency

            const dto = { title: 'Updated' };

            await expect(service.updateTemplate('trip-123', 'agency-456', dto)).rejects.toThrow('Trip template not found or unauthorized');
        });
    });

    describe('deleteTemplate', () => {
        it('should delete a template if owned by user', async () => {
            db.tripTemplate.findFirst.mockResolvedValue(mockTripTemplate);
            db.tripTemplate.delete.mockResolvedValue(mockTripTemplate);

            await service.deleteTemplate('trip-123', 'agency-123');

            expect(db.tripTemplate.findFirst).toHaveBeenCalledWith({
                where: { id: 'trip-123', agencyId: 'agency-123' },
            });
            expect(db.tripTemplate.delete).toHaveBeenCalledWith({ where: { id: 'trip-123' } });
        });

        it('should throw error if unauthorized', async () => {
            db.tripTemplate.findFirst.mockResolvedValue(null); // Not found for this agency

            await expect(service.deleteTemplate('trip-123', 'agency-456')).rejects.toThrow('Trip template not found or unauthorized');
        });
    });
});
