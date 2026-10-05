import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripSessionDto } from './dto/create-trip.dto';
import { BookingStatus, SessionStatus, TripStatus } from '@ouiboo/database';
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

        const data = {
            ...tripData,
            agencyId: agencyId,
            status: TripStatus.DRAFT,
            itinerary: itinerary && itinerary.length > 0 ? {
                create: itinerary
            } : undefined
        };


        const result = await this.db.tripTemplate.create({
            data,
            include: {
                itinerary: true
            }
        });

        return result;
    }

    async findAllTemplates(filters?: {
        featured?: boolean;
        status?: string;
        q?: string;
        category?: string;
        agencyId?: string;
        currency?: string;
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
                q,
                category,
                agencyId,
                currency,
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
                status: TripStatus.ACTIVE,
            };

            if (featured) where.featured = true;
            if (agencyId) where.agencyId = agencyId;
            if (currency) where.currency = currency;
            // Normalize category to uppercase enum value (#119: ?category=adventure -> ADVENTURE)
            if (category) {
                const normalized = category.toUpperCase();
                // Validate against known enum values to avoid Prisma errors
                if (['ADVENTURE', 'CULTURAL', 'LUXURY', 'BUDGET', 'NATURE'].includes(normalized)) {
                    where.category = normalized as any;
                }
            }
            if (q?.trim()) {
                const search = q.trim();
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { startLocation: { contains: search, mode: 'insensitive' } },
                ];
            }

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

            const requiresMatchingSession =
                available === true ||
                startDateFrom !== undefined ||
                startDateTo !== undefined ||
                priceMin !== undefined ||
                priceMax !== undefined;
            if (requiresMatchingSession) {
                where.sessions = { some: sessionWhere };
            }

            // Build sort order
            const orderBy: any = {};
            if (safeSortBy === 'price') {
                orderBy.startingPrice = { sort: sortOrder, nulls: 'last' };
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

            return {
                data: templates,
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
        const result = await this.db.tripTemplate.findFirst({
            where: { id, status: TripStatus.ACTIVE },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                startLocation: true,
                endLocation: true,
                durationDays: true,
                durationNights: true,
                inclusions: true,
                exclusions: true,
                checklist: true,
                images: true,
                status: true,
                featured: true,
                currency: true,
                averageRating: true,
                reviewCount: true,
                cancellationPolicy: true,
                minBookings: true,
                createdAt: true,
                updatedAt: true,
                sessions: {
                    where: {
                        status: SessionStatus.OPEN,
                        startDate: { gte: new Date() },
                    },
                    orderBy: { startDate: 'asc' },
                },
                agency: {
                    select: {
                        id: true,
                        companyName: true,
                        logo: true,
                        verificationStatus: true,
                    },
                },
                itinerary: {
                    orderBy: { dayNumber: 'asc' },
                },
                _count: {
                    select: { reviews: true, wishlists: true },
                },
            },
        });
        if (!result) throw new NotFoundException('Trip template not found');
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
            select: { id: true, currency: true },
        });

        if (!template) throw new NotFoundException('Trip template not found');

        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (startDate <= new Date()) {
            throw new BadRequestException('Session start date must be in the future');
        }
        if (endDate <= startDate) {
            throw new BadRequestException('Session end date must be after its start date');
        }
        const price = toMoneyDecimal(dto.price, 'price');
        const deposit = toMoneyDecimal(dto.deposit ?? 0, 'deposit');
        if (deposit.greaterThan(price)) {
            throw new BadRequestException('Deposit cannot exceed the session price');
        }

        const requestedCurrency = dto.currency ?? template.currency;
        this.assertTripCurrency(template.currency, requestedCurrency);

        const session = await this.db.tripSession.create({
            data: {
                templateId,
                price,
                deposit,
                totalSeats: dto.totalSeats,
                availableSeats: dto.totalSeats,
                startDate,
                endDate,
                currency: requestedCurrency,
            },
        });
        await this.refreshStartingPrice(templateId);
        return session;
    }

    async updateSession(agencyId: string, templateId: string, sessionId: string, dto: UpdateTripSessionDto) {
        const session = await this.db.tripSession.findFirst({
            where: { id: sessionId, templateId, template: { agencyId } },
            include: {
                _count: { select: { bookings: true } },
                template: { select: { currency: true } },
            },
        });
        if (!session) throw new NotFoundException('Trip session not found');
        if (session._count.bookings > 0) {
            throw new ConflictException('Sessions with bookings cannot be edited');
        }

        const startDate = dto.startDate ? new Date(dto.startDate) : session.startDate;
        const endDate = dto.endDate ? new Date(dto.endDate) : session.endDate;
        if (startDate <= new Date()) {
            throw new BadRequestException('Session start date must be in the future');
        }
        if (endDate <= startDate) {
            throw new BadRequestException('Session end date must be after its start date');
        }
        const price = dto.price !== undefined ? toMoneyDecimal(dto.price, 'price') : session.price;
        const deposit = dto.deposit !== undefined ? toMoneyDecimal(dto.deposit, 'deposit') : session.deposit;
        if (deposit.greaterThan(price)) {
            throw new BadRequestException('Deposit cannot exceed the session price');
        }

        const currency = dto.currency ?? session.currency;
        this.assertTripCurrency(session.template.currency, currency);

        const updated = await this.db.tripSession.update({
            where: { id: sessionId },
            data: {
                startDate,
                endDate,
                price,
                deposit,
                currency,
                totalSeats: dto.totalSeats,
                availableSeats: dto.totalSeats,
            },
        });
        await this.refreshStartingPrice(templateId);
        return updated;
    }

    async deleteSession(agencyId: string, templateId: string, sessionId: string) {
        const session = await this.db.tripSession.findFirst({
            where: { id: sessionId, templateId, template: { agencyId } },
            include: { _count: { select: { bookings: true } } },
        });
        if (!session) throw new NotFoundException('Trip session not found');
        if (session._count.bookings > 0) {
            throw new ConflictException('Sessions with bookings cannot be deleted');
        }
        const deleted = await this.db.tripSession.delete({ where: { id: sessionId } });
        await this.refreshStartingPrice(templateId);
        return deleted;
    }

    async findSessionsByTemplate(templateId: string) {
        const template = await this.db.tripTemplate.findFirst({
            where: { id: templateId, status: TripStatus.ACTIVE },
            select: { id: true },
        });
        if (!template) throw new NotFoundException('Trip template not found');

        return this.db.tripSession.findMany({
            where: {
                templateId,
                status: SessionStatus.OPEN,
                startDate: { gte: new Date() },
            },
            orderBy: { startDate: 'asc' },
        });
    }

    async updateTemplate(id: string, agencyId: string, dto: Partial<CreateTripTemplateDto>) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency) throw new NotFoundException('Agency profile not found');

        const { itinerary, status: requestedStatus, ...tripData } = dto;

        // Verify ownership
        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId },
            include: { _count: { select: { sessions: true } } },
        });
        if (!existing) throw new NotFoundException('Trip template not found');

        if (dto.currency && dto.currency !== existing.currency && existing._count.sessions > 0) {
            throw new ConflictException('Trip currency cannot change after sessions have been created');
        }

        const status = requestedStatus ?? existing.status;

        return this.db.tripTemplate.update({
            where: { id },
            data: {
                ...tripData,
                status,
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

        const activeBookings = await this.db.booking.count({
            where: {
                session: { templateId: id },
                status: {
                    in: [
                        BookingStatus.PENDING,
                        BookingStatus.AWAITING_VALIDATION,
                        BookingStatus.CONFIRMED,
                    ],
                },
            },
        });
        if (activeBookings > 0) {
            throw new ConflictException('Trips with active bookings cannot be archived');
        }

        return this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.ARCHIVED },
        });
    }

    private async refreshStartingPrice(templateId: string) {
        const aggregate = await this.db.tripSession.aggregate({
            where: {
                templateId,
                status: SessionStatus.OPEN,
                startDate: { gte: new Date() },
            },
            _min: { price: true },
        });
        await this.db.tripTemplate.update({
            where: { id: templateId },
            data: { startingPrice: aggregate._min.price },
        });
    }

    private assertTripCurrency(tripCurrency: string, currency: string) {
        if (tripCurrency !== currency) {
            throw new BadRequestException(
                `Session currency must match the trip currency (${tripCurrency})`,
            );
        }
    }
}
