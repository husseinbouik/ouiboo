"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const trips_service_1 = require("./trips.service");
const database_service_1 = require("../database/database.service");
const common_1 = require("@nestjs/common");
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
    agencyProfile: {
        findUnique: jest.fn(),
    },
};
describe('TripsService', () => {
    let service;
    let db;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                trips_service_1.TripsService,
                {
                    provide: database_service_1.DatabaseService,
                    useValue: mockDatabaseService,
                },
            ],
        }).compile();
        service = module.get(trips_service_1.TripsService);
        db = module.get(database_service_1.DatabaseService);
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
            db.tripTemplate.findFirst.mockResolvedValue(null);
            const dto = { title: 'Updated' };
            await expect(service.updateTemplate('trip-123', 'user-123', dto)).rejects.toThrow(common_1.NotFoundException);
        });
        it('should throw error if agency profile not found', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(null);
            await expect(service.updateTemplate('trip-123', 'user-999', {})).rejects.toThrow(common_1.ForbiddenException);
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
            db.tripTemplate.findFirst.mockResolvedValue(null);
            await expect(service.deleteTemplate('trip-123', 'user-123')).rejects.toThrow(common_1.NotFoundException);
        });
    });
});
//# sourceMappingURL=trips.service.spec.js.map