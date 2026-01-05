"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let TripsService = class TripsService {
    constructor(db) {
        this.db = db;
    }
    async createTemplate(userId, dto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { userId }
        });
        if (!agency) {
            throw new Error('Agency profile not found');
        }
        return this.db.tripTemplate.create({
            data: {
                ...dto,
                agencyId: agency.id,
            },
        });
    }
    async findAllTemplates(featured) {
        try {
            return await this.db.tripTemplate.findMany({
                where: featured ? { featured: true } : {},
                include: {
                    _count: {
                        select: { sessions: true },
                    },
                },
            });
        }
        catch (error) {
            console.error('Error in findAllTemplates:', error);
            throw error;
        }
    }
    async findOneTemplate(id) {
        return this.db.tripTemplate.findUnique({
            where: { id },
            include: {
                sessions: true,
                agency: true,
            },
        });
    }
    async createSession(templateId, dto) {
        return this.db.tripSession.create({
            data: {
                ...dto,
                templateId,
                availableSeats: dto.totalSeats,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
        });
    }
    async findSessionsByTemplate(templateId) {
        return this.db.tripSession.findMany({
            where: { templateId },
        });
    }
    async updateTemplate(id, dto) {
        return this.db.tripTemplate.update({
            where: { id },
            data: dto,
        });
    }
    async removeTemplate(id) {
        return this.db.tripTemplate.delete({
            where: { id },
        });
    }
};
exports.TripsService = TripsService;
exports.TripsService = TripsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TripsService);
//# sourceMappingURL=trips.service.js.map