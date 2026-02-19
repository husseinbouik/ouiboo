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
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });
        if (!agency) {
            throw new common_1.ForbiddenException('Agency profile not found');
        }
        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Creating template. Itinerary count: ${itinerary?.length || 0}`);
        const data = {
            ...tripData,
            agencyId: agencyId,
            itinerary: itinerary && itinerary.length > 0 ? {
                create: itinerary
            } : undefined
        };
        console.log(`[TripsService] Prisma Create Data:`, JSON.stringify(data, null, 2));
        const result = await this.db.tripTemplate.create({
            data,
            include: {
                itinerary: true
            }
        });
        console.log(`[TripsService] Created template ${result.id} for agency ${agencyId}. Status: ${result.status}`);
        return result;
    }
    async findAllTemplates(filters) {
        try {
            const { featured, status, priceMin, priceMax, durationMin, durationMax, startDateFrom, startDateTo, ratingMin, available, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, } = filters || {};
            const where = {
                status: status || 'APPROVED',
            };
            if (featured)
                where.featured = true;
            if (durationMin !== undefined || durationMax !== undefined) {
                where.durationDays = {};
                if (durationMin !== undefined)
                    where.durationDays.gte = durationMin;
                if (durationMax !== undefined)
                    where.durationDays.lte = durationMax;
            }
            if (ratingMin !== undefined) {
                where.averageRating = { gte: ratingMin };
            }
            const sessionWhere = {
                status: 'OPEN',
                startDate: { gte: new Date() },
            };
            if (startDateFrom) {
                sessionWhere.startDate.gte = startDateFrom;
            }
            if (startDateTo) {
                sessionWhere.startDate.lte = startDateTo;
            }
            if (available) {
                sessionWhere.availableSeats = { gt: 0 };
            }
            if (priceMin !== undefined || priceMax !== undefined) {
                sessionWhere.price = {};
                if (priceMin !== undefined)
                    sessionWhere.price.gte = priceMin;
                if (priceMax !== undefined)
                    sessionWhere.price.lte = priceMax;
            }
            const orderBy = {};
            if (sortBy === 'price') {
                orderBy.sessions = { _count: sortOrder };
            }
            else if (sortBy === 'rating') {
                orderBy.averageRating = sortOrder;
            }
            else if (sortBy === 'popularity') {
                orderBy._count = { sessions: sortOrder };
            }
            else {
                orderBy[sortBy] = sortOrder;
            }
            const skip = (page - 1) * limit;
            const [templates, total] = await Promise.all([
                this.db.tripTemplate.findMany({
                    where,
                    include: {
                        sessions: {
                            where: sessionWhere,
                            orderBy: { startDate: 'asc' },
                            take: 5,
                        },
                        agency: {
                            select: {
                                companyName: true,
                                logo: true,
                                id: true,
                            },
                        },
                        reviews: {
                            select: { rating: true },
                        },
                        _count: {
                            select: { sessions: true, reviews: true, wishlists: true },
                        },
                    },
                    orderBy,
                    skip,
                    take: limit,
                }),
                this.db.tripTemplate.count({ where }),
            ]);
            let filtered = templates;
            if (priceMin !== undefined || priceMax !== undefined) {
                filtered = templates.filter(template => {
                    if (template.sessions.length === 0)
                        return false;
                    const minPrice = Math.min(...template.sessions.map(s => s.price));
                    if (priceMin !== undefined && minPrice < priceMin)
                        return false;
                    if (priceMax !== undefined && minPrice > priceMax)
                        return false;
                    return true;
                });
            }
            return {
                data: filtered,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            console.error('Error in findAllTemplates:', error);
            throw error;
        }
    }
    async findOneTemplate(id) {
        console.log('[TripsService] findOneTemplate called with ID:', id);
        const result = await this.db.tripTemplate.findUnique({
            where: { id },
            include: {
                sessions: true,
                agency: true,
                itinerary: {
                    orderBy: { dayNumber: 'asc' }
                },
            },
        });
        console.log('[TripsService] Result found:', !!result);
        return result;
    }
    async createSession(agencyId, templateId, dto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });
        if (!agency) {
            throw new common_1.ForbiddenException('Agency profile not found');
        }
        const template = await this.db.tripTemplate.findFirst({
            where: {
                id: templateId,
                agencyId: agencyId,
            },
        });
        if (!template) {
            throw new common_1.ForbiddenException('Trip template not found or access denied');
        }
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
    async updateTemplate(id, agencyId, dto) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency)
            throw new common_1.ForbiddenException('Agency profile not found');
        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Updating template ${id} for agency ${agencyId}`);
        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing)
            throw new common_1.NotFoundException('Trip template not found');
        return this.db.tripTemplate.update({
            where: { id },
            data: {
                ...tripData,
                itinerary: itinerary ? {
                    deleteMany: {},
                    create: itinerary
                } : undefined
            },
            include: {
                itinerary: true
            }
        });
    }
    async deleteTemplate(id, agencyId) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency)
            throw new common_1.ForbiddenException('Agency profile not found');
        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing)
            throw new common_1.NotFoundException('Trip template not found');
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