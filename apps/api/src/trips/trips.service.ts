import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';
import { SessionStatus, TripStatus } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';

@Injectable()
export class TripsService {
    constructor(private db: DatabaseService) { }

    async createTemplate(agencyId: string, dto: CreateTripTemplateDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });

        if (!agency) {
            throw new ForbiddenException('Agency profile not found');
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

    async findAllTemplates(filters?: {
        featured?: boolean;
        status?: string;
        q?: string;
        category?: string;
        agencyId?: string;
        priceMin?: number;
        priceMax?: number;
        durationMin?: number;
        durationMax?: number;
        startDateFrom?: Date;
        startDateTo?: Date;
        ratingMin?: number;
        available?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }) {
        try {
            const {
                featured,
                status,
                q,
                category,
                agencyId,
                priceMin,
                priceMax,
                durationMin,
                durationMax,
                startDateFrom,
                startDateTo,
                ratingMin,
                available,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                page = 1,
                limit = 20,
            } = filters || {};
            const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
            const safeLimit = Math.min(Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 20), 50);
            const allowedSortFields = new Set(['createdAt', 'updatedAt', 'durationDays', 'averageRating', 'price', 'rating', 'popularity']);
            const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';

            // Build WHERE clause for trip templates
            const where: any = {
                status: status === TripStatus.ACTIVE ? TripStatus.ACTIVE : TripStatus.ACTIVE,
            };

            if (featured) where.featured = true;
            if (agencyId) where.agencyId = agencyId;
            if (category) where.category = category;
            if (q?.trim()) {
                const search = q.trim();
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { startLocation: { contains: search, mode: 'insensitive' } },
                ];
            }

            // Price filter: applied to sessions, so we'll filter after query
            // Duration filter
            if (durationMin !== undefined || durationMax !== undefined) {
                where.durationDays = {};
                if (durationMin !== undefined) where.durationDays.gte = durationMin;
                if (durationMax !== undefined) where.durationDays.lte = durationMax;
            }

            // Rating filter
            if (ratingMin !== undefined) {
                where.averageRating = { gte: ratingMin };
            }

            // Build session filters for nested query
            const sessionWhere: any = {
                status: SessionStatus.OPEN,
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

            // Price filter on sessions
            if (priceMin !== undefined || priceMax !== undefined) {
                sessionWhere.price = {};
                if (priceMin !== undefined) sessionWhere.price.gte = toMoneyDecimal(priceMin, 'priceMin');
                if (priceMax !== undefined) sessionWhere.price.lte = toMoneyDecimal(priceMax, 'priceMax');
            }

            // Build sort order
            const orderBy: any = {};
            if (safeSortBy === 'price') {
                // For price sorting, we'd need to sort by session price, default to sessions[0]
                orderBy.sessions = { _count: sortOrder };
            } else if (safeSortBy === 'rating') {
                orderBy.averageRating = sortOrder;
            } else if (safeSortBy === 'popularity') {
                // Sort by booking count or review count
                orderBy._count = { sessions: sortOrder };
            } else {
                // Default sort by createdAt
                orderBy[safeSortBy] = sortOrder;
            }

            // Query with pagination
            const skip = (safePage - 1) * safeLimit;

            const [templates, total] = await Promise.all([
                this.db.tripTemplate.findMany({
                    where,
                    include: {
                        sessions: {
                            where: sessionWhere,
                            orderBy: { startDate: 'asc' },
                            take: 5, // Limit sessions shown per template
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
                    take: safeLimit,
                }),
                this.db.tripTemplate.count({ where }),
            ]);

            // Post-process: filter by price if needed (in case DB index doesn't support it)
            let filtered = templates;
            if (priceMin !== undefined || priceMax !== undefined) {
                filtered = templates.filter(template => {
                    if (template.sessions.length === 0) return false;
                    const minPrice = Math.min(...template.sessions.map(s => Number(s.price)));
                    if (priceMin !== undefined && minPrice < priceMin) return false;
                    if (priceMax !== undefined && minPrice > priceMax) return false;
                    return true;
                });
            }

            return {
                data: filtered,
                pagination: {
                    total,
                    page: safePage,
                    limit: safeLimit,
                    totalPages: Math.ceil(total / safeLimit),
                },
            };
        } catch (error) {
            console.error('Error in findAllTemplates:', error);
            throw error;
        }
    }

    async findOneTemplate(id: string) {
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

    async createSession(agencyId: string, templateId: string, dto: CreateTripSessionDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });
        if (!agency) {
            throw new ForbiddenException('Agency profile not found');
        }

        const template = await this.db.tripTemplate.findFirst({
            where: {
                id: templateId,
                agencyId: agencyId,
            },
        });

        if (!template) {
            throw new ForbiddenException('Trip template not found or access denied');
        }

        return this.db.tripSession.create({
            data: {
                templateId,
                price: toMoneyDecimal(dto.price, 'price'),
                deposit: toMoneyDecimal(dto.deposit ?? 0, 'deposit'),
                totalSeats: dto.totalSeats,
                availableSeats: dto.totalSeats,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
        });
    }

    async findSessionsByTemplate(templateId: string) {
        return this.db.tripSession.findMany({
            where: { templateId },
        });
    }

    async updateTemplate(id: string, agencyId: string, dto: Partial<CreateTripTemplateDto>) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency) throw new NotFoundException('Agency profile not found');

        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Updating template ${id} for agency ${agencyId}`);

        // Verify ownership
        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing) throw new NotFoundException('Trip template not found');

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

    async deleteTemplate(id: string, agencyId: string) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency) throw new NotFoundException('Agency profile not found');

        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing) throw new NotFoundException('Trip template not found');

        return this.db.tripTemplate.delete({
            where: { id },
        });
    }
}
