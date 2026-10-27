import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripSessionDto } from './dto/create-trip.dto';
import { BookingPaymentStatus, BookingStatus, Prisma, SessionStatus, TripStatus } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';
import { canOrganise, getAgencyActivationBlock } from '../common/agency-licence.util';
import { visibleBankDetails } from '../common/bank-details.util';
import { resolveStagedSessionConfig } from '../staged-payments/staged-payments.util';
import {
    buildCancellationScaleSnapshot,
    normalizeCancellationPolicyInput,
} from '../cancellation/cancellation.util';

@Injectable()
export class TripsService {
    constructor(private db: DatabaseService) { }

    /**
     * #332: normalize agency-provided image alt texts — trim, cap the
     * length, and align with the image list (missing entries become '',
     * extras are dropped) so `imageAlts[i]` always describes `images[i]`.
     * Returns undefined when no alt texts were supplied, leaving the
     * stored value (or the column default) untouched.
     */
    private normalizeImageAlts(imageAlts: string[] | undefined, images: string[] | undefined): string[] | undefined {
        if (!imageAlts) return undefined;
        const cleaned = imageAlts.map((alt) => (typeof alt === 'string' ? alt.trim().slice(0, 300) : ''));
        if (!images) return cleaned;
        return images.map((_, i) => cleaned[i] ?? '');
    }

    /**
     * #371: publishing gate. Moving a trip INTO the marketplace (ACTIVE)
     * requires a verified agency identity AND a verified, unexpired
     * travel licence. Already-ACTIVE trips are never blocked by this —
     * it only runs on transitions into ACTIVE.
     * #415: the activation block now also requires verified, unexpired
     * RC insurance, and a DV (distributeur) agency may never publish —
     * it does not organise trips.
     */
    private async assertAgencyCanPublish(agencyId: string) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId },
            select: {
                verificationStatus: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
                travelLicenceType: true,
                insuranceStatus: true,
                insuranceExpiry: true,
            },
        });
        const block = agency ? getAgencyActivationBlock(agency) : 'Agency profile not found';
        if (block) throw new ForbiddenException(block);
        if (agency && !canOrganise(agency)) {
            throw new ForbiddenException(
                'A distributor (DV) licence does not permit organising trips — only ODV agencies can publish trips',
            );
        }
    }

    async createTemplate(agencyId: string, dto: CreateTripTemplateDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });

        if (!agency) {
            throw new ForbiddenException('Agency profile not found');
        }

        // #415 (Council P0-08): ODV/DV enforcement at creation. A DV
        // (distributeur) distributes other organisers' trips and may not
        // organise its own — not even as a draft. The check applies once
        // a licence type is declared; an agency that has not submitted
        // its licence yet can still draft (publishing stays fully gated
        // by assertAgencyCanPublish).
        if (agency.travelLicenceType && !canOrganise(agency)) {
            throw new ForbiddenException(
                'A distributor (DV) licence does not permit organising trips — only ODV agencies can create trips',
            );
        }

        const { itinerary, imageAlts, cancellationPolicy, ...tripData } = dto;

        const data = {
            ...tripData,
            // #417 (Council P0-11): validate + normalize the agency's
            // cancellation bands before they are stored as structured
            // data (throws on coverage gaps / duplicates / bad ranges).
            cancellationPolicy: cancellationPolicy
                ? (normalizeCancellationPolicyInput(cancellationPolicy) as unknown as Prisma.InputJsonValue)
                : undefined,
            imageAlts: this.normalizeImageAlts(imageAlts, dto.images),
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
            // Only show trips from verified agencies (launch blocker #182)
            const where: any = {
                status: TripStatus.ACTIVE,
                agency: {
                    verificationStatus: 'VERIFIED',
                },
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
                                // #317: the traveler card badges verified agencies from
                                // this field; without it every card read "Agency Pending".
                                verificationStatus: true,
                                // #413 (Council B10): the card renders an explicit
                                // what+when statement (what was checked + the date),
                                // so the licence/insurance states and their
                                // verification stamps ride along.
                                travelLicenceStatus: true,
                                licenceVerifiedAt: true,
                                insuranceStatus: true,
                                insuranceVerifiedAt: true,
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
            where: {
                id,
                status: TripStatus.ACTIVE,
                agency: { verificationStatus: 'VERIFIED' },
            },
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
                imageAlts: true,
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
                        // #380: checkout renders the agency's bank
                        // instructions from this field and blocks booking when
                        // it is empty; without it in the select, checkout read
                        // undefined and refused every booking.
                        bankDetails: true,
                        // #421: the instructions are only exposed when the
                        // destination is admin-verified (see the mapping
                        // below); the status fields drive that gate.
                        bankDetailsStatus: true,
                        bankDetailsVerifiedAt: true,
                        // #371: seller-of-record display on the trip page and
                        // at checkout (legal name + verified licence number).
                        // B4: the complete seller block also carries the
                        // licence type, issue date, and issuing authority;
                        // SellerIdentity withholds them client-side unless
                        // the licence is verified (same derivation as the
                        // public profile endpoint).
                        legalName: true,
                        travelLicenceType: true,
                        travelLicenceNumber: true,
                        travelLicenceStatus: true,
                        licenceExpiry: true,
                        licenceIssuedAt: true,
                        licenceIssuingAuthority: true,
                        // #413 (Council B10): what+when verification statement
                        // next to the seller identity — the licence check date
                        // and the RC insurance evidence date.
                        licenceVerifiedAt: true,
                        insuranceStatus: true,
                        insuranceVerifiedAt: true,
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
        // #421 (Council P0-19): strip the bank instructions server-side
        // unless the destination is admin-verified against a bank
        // attestation. During a replacement review the previously
        // verified instructions stay live (visibleBankDetails encodes
        // that rule); the verification stamp itself is not exposed.
        const { bankDetailsVerifiedAt: _verificationStamp, ...publicAgency } = result.agency;
        return {
            ...result,
            // #417 (Council P0-11): the resolved cancellation scale
            // (agency bands, or the platform defaults when the trip has
            // none) plus the platform floor terms — this is the scale
            // displayed in MAD before payment and snapshotted onto the
            // booking at creation. The raw stored policy stays in
            // `cancellationPolicy` for the agency editor.
            cancellationScale: buildCancellationScaleSnapshot(result.cancellationPolicy),
            agency: {
                ...publicAgency,
                bankDetails: visibleBankDetails(result.agency),
            },
        };
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

        // #369: staged-payment configuration (deposit cap, deadline rules).
        const stagedConfig = resolveStagedSessionConfig({
            price,
            deposit,
            minBookings: dto.minBookings ?? 1,
            confirmationDeadline: dto.confirmationDeadline ? new Date(dto.confirmationDeadline) : null,
            startDate,
        });


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
                minBookings: dto.minBookings ?? 1,
                confirmationDeadline: stagedConfig.confirmationDeadline,
                groupStatus: stagedConfig.groupStatus,
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

        // #369: validate the merged staged-payment configuration (a partial
        // update can create or break a staged session).
        const minBookings = dto.minBookings ?? session.minBookings;
        const stagedConfig = resolveStagedSessionConfig({
            price,
            deposit,
            minBookings,
            confirmationDeadline: dto.confirmationDeadline
                ? new Date(dto.confirmationDeadline)
                : session.confirmationDeadline,
            startDate,
        });


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
                minBookings,
                confirmationDeadline: stagedConfig.confirmationDeadline,
                groupStatus: stagedConfig.groupStatus,
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
            where: {
                id: templateId,
                status: TripStatus.ACTIVE,
                agency: { verificationStatus: 'VERIFIED' },
            },
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

        const { itinerary, status: requestedStatus, imageAlts, cancellationPolicy, ...tripData } = dto;

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

        // #371: a status change INTO Active is a publish transition and
        // goes through the same identity + licence gate as activate.
        if (status === TripStatus.ACTIVE && existing.status !== TripStatus.ACTIVE) {
            await this.assertAgencyCanPublish(agencyId);
        }

        return this.db.tripTemplate.update({
            where: { id },
            data: {
                ...tripData,
                // #417: same validated normalization as create; omitting
                // the field leaves the stored bands untouched.
                cancellationPolicy: cancellationPolicy
                    ? (normalizeCancellationPolicyInput(cancellationPolicy) as unknown as Prisma.InputJsonValue)
                    : undefined,
                imageAlts: this.normalizeImageAlts(imageAlts, dto.images ?? existing.images),
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

    /**
     * Trip lifecycle (see #114):
     * - deactivate: ACTIVE -> INACTIVE. Always allowed. Hides from marketplace,
     *   existing bookings/sessions untouched. Use to pause sales.
     * - activate: INACTIVE -> ACTIVE. Re-publish a deactivated trip.
     * - archive: ACTIVE/INACTIVE -> ARCHIVED. Blocked with active bookings.
     *   Trip leaves the marketplace but all records are preserved.
     * - restore: ARCHIVED -> ACTIVE. Bring back an archived trip.
     * - delete: DRAFT only, zero sessions/bookings. True hard delete.
     */
    private async getOwnedTemplate(id: string, agencyId: string) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency) throw new NotFoundException('Agency profile not found');

        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing) throw new NotFoundException('Trip template not found');
        return existing;
    }

    private async countActiveBookings(templateId: string) {
        return this.db.booking.count({
            where: {
                session: { templateId },
                status: {
                    in: [
                        BookingStatus.PENDING,
                        BookingStatus.AWAITING_VALIDATION,
                        BookingStatus.CONFIRMED,
                    ],
                },
                // #412 (Council Session #2, B15): a fully refunded
                // booking (paymentStatus REFUNDED, derived from ledger
                // totals when its refund cases complete) is
                // economically closed — the traveller's money went
                // back in full — so it must not block archiving the
                // trip. Partially refunded bookings keep paymentStatus
                // PAID/PARTIALLY_PAID and still count as active.
                paymentStatus: { not: BookingPaymentStatus.REFUNDED },
            },
        });
    }

    async deactivateTemplate(id: string, agencyId: string) {
        const existing = await this.getOwnedTemplate(id, agencyId);
        if (existing.status !== TripStatus.ACTIVE) {
            throw new ConflictException('Only active trips can be deactivated');
        }
        return this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.INACTIVE },
        });
    }

    async activateTemplate(id: string, agencyId: string) {
        const existing = await this.getOwnedTemplate(id, agencyId);
        if (existing.status !== TripStatus.INACTIVE) {
            throw new ConflictException('Only deactivated trips can be re-activated');
        }
        await this.assertAgencyCanPublish(agencyId);
        return this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.ACTIVE },
        });
    }

    async archiveTemplate(id: string, agencyId: string) {
        const existing = await this.getOwnedTemplate(id, agencyId);
        if (existing.status === TripStatus.ARCHIVED) {
            throw new ConflictException('Trip is already archived');
        }
        if (existing.status === TripStatus.DRAFT) {
            throw new ConflictException('Drafts cannot be archived; delete them instead');
        }
        const activeBookings = await this.countActiveBookings(id);
        if (activeBookings > 0) {
            throw new ConflictException(
                `This trip has ${activeBookings} active booking(s). ` +
                `Complete or cancel them before archiving. ` +
                `You can deactivate the trip to stop new bookings while existing ones run their course.`
            );
        }
        return this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.ARCHIVED },
        });
    }

    async restoreTemplate(id: string, agencyId: string) {
        const existing = await this.getOwnedTemplate(id, agencyId);
        if (existing.status !== TripStatus.ARCHIVED) {
            throw new ConflictException('Only archived trips can be restored');
        }
        await this.assertAgencyCanPublish(agencyId);
        return this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.ACTIVE },
        });
    }

    async deleteTemplate(id: string, agencyId: string) {
        const existing = await this.getOwnedTemplate(id, agencyId);

        // Hard delete is only safe for untouched drafts
        if (existing.status !== TripStatus.DRAFT) {
            throw new ConflictException(
                'Only draft trips can be permanently deleted. Archive published trips instead to preserve booking records.'
            );
        }
        const sessionCount = await this.db.tripSession.count({ where: { templateId: id } });
        if (sessionCount > 0) {
            throw new ConflictException('Drafts with sessions cannot be permanently deleted; archive them instead');
        }

        return this.db.$transaction(async (tx) => {
            await tx.itineraryDay.deleteMany({ where: { templateId: id } });
            await tx.review.deleteMany({ where: { tripTemplateId: id } });
            return tx.tripTemplate.delete({ where: { id } });
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
