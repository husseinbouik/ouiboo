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
    async createTemplate(agencyId, dto) {
        return this.db.tripTemplate.create({
            data: {
                ...dto,
                agencyId,
            },
        });
    }
    async findAllTemplates(featured) {
        return this.db.tripTemplate.findMany({
            where: featured ? { featured: true } : {},
            include: {
                _count: {
                    select: { sessions: true },
                },
            },
        });
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
};
exports.TripsService = TripsService;
exports.TripsService = TripsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TripsService);
//# sourceMappingURL=trips.service.js.map