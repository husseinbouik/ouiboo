import { Injectable } from '@nestjs/common';
import { Controller, Get, UseGuards, Request, Patch, Body, Post, Query, Param, Res, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { DatabaseService } from '../database/database.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT, mapBookingDetails } from '../bookings/booking-response.util';
import { serializeDuplicateCreditFlag } from '../bookings/bookings.service';
import { toMoneyString } from '../common/money.util';
import { derivePublicMediaUrl } from '../upload/media-url.util';
import { bookingsToCsv, reviewsToCsv, tripsToCsv } from './agency-export.util';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import {
    aggregateCrmContacts,
    aggregateCrmPipeline,
    CRM_PIPELINE_STATUSES,
} from './agency-crm.util';

// #786: cap for the CRM contacts derivation — same generous bound as
// the #780 exports; beta agencies are far below it.
const CRM_MAX_BOOKINGS = 10000;

// #780: a generous row cap keeps a self-serve export from becoming an
// unbounded full-table scan; beta agencies are far below it.
const EXPORT_MAX_ROWS = 10000;

const sendCsv = (res: Response, filename: string, csv: string) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
};

const exportFilename = (kind: string) =>
    `ouiboo-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;

const clampListLimit = (value?: string, fallback = 50, max = 200) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.floor(parsed), 1), max);
};

const parsePage = (value?: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(Math.floor(parsed), 1);
};

@Injectable()
export class AgencyDashboardService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly externalPaymentsService: ExternalPaymentsService,
    ) { }

    async listDuplicateCreditFlags(@Request() req: AuthenticatedRequest) {
        const flags = await this.prisma.duplicateCreditFlag.findMany({
            where: { agencyId: req.tenantId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return flags.map(serializeDuplicateCreditFlag);
    }

    async cancelSubscription(@Request() req: AuthenticatedRequest) {
        const agencyId = req.tenantId;
        const profile = await this.prisma.agencyProfile.findUnique({
            where: { id: agencyId },
            select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true },
        });
        if (!profile) throw new NotFoundException('Agency profile not found');
        if (profile.subscriptionStatus !== 'TRIAL' && profile.subscriptionStatus !== 'ACTIVE') {
            throw new BadRequestException('Only a trial or active subscription can be cancelled');
        }
        const updated = await this.prisma.agencyProfile.update({
            where: { id: agencyId },
            data: { cancelAtPeriodEnd: true, cancellationRequestedAt: new Date() },
            select: { cancelAtPeriodEnd: true, cancellationRequestedAt: true, trialEndsAt: true, subscriptionEndsAt: true },
        });
        return {
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
            cancellationRequestedAt: updated.cancellationRequestedAt,
            // Access continues until this boundary; the SubscriptionGuard ends it there.
            effectiveAt: updated.subscriptionEndsAt ?? updated.trialEndsAt,
        };
    }

    async resumeSubscription(@Request() req: AuthenticatedRequest) {
        const agencyId = req.tenantId;
        const profile = await this.prisma.agencyProfile.findUnique({
            where: { id: agencyId },
            select: { id: true },
        });
        if (!profile) throw new NotFoundException('Agency profile not found');
        const updated = await this.prisma.agencyProfile.update({
            where: { id: agencyId },
            data: { cancelAtPeriodEnd: false, cancellationRequestedAt: null },
            select: { cancelAtPeriodEnd: true },
        });
        return { cancelAtPeriodEnd: updated.cancelAtPeriodEnd };
    }

    async getStats(@Request() req: AuthenticatedRequest) {
        const agencyId = req.tenantId!;

        const [tripsCount, bookings, payments] = await Promise.all([
            this.prisma.tripTemplate.count({
                where: { agencyId, status: 'ACTIVE' },
            }),
            this.prisma.booking.groupBy({
                by: ['travelerId'],
                where: {
                    session: {
                        template: { agencyId }
                    },
                },
            }),
            this.externalPaymentsService.getAgencyPaymentsOverview(agencyId),
        ]);

        const [bookingCount, revenueAggregate] = await Promise.all([
            this.prisma.booking.count({
                where: {
                    session: { template: { agencyId } },
                },
            }),
            this.prisma.booking.aggregate({
                where: {
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    session: { template: { agencyId } },
                },
                _sum: { totalAmount: true },
            }),
        ]);

        return {
            revenue: toMoneyString(revenueAggregate._sum.totalAmount) || '0.00',
            activeTrips: tripsCount,
            totalBookings: bookingCount,
            totalCustomers: bookings.length,
            // #368: payment facts about money held by the agency / its PSP.
            // There is no OuiBoo balance for traveller money anymore.
            payments,
        };
    }

    async getTrips(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const currentPage = parsePage(page);
        const skip = (currentPage - 1) * take;
        const where = { agencyId };

        const [data, total] = await Promise.all([
            this.prisma.tripTemplate.findMany({
                where,
                include: {
                    sessions: {
                        include: {
                            _count: {
                                select: { bookings: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.tripTemplate.count({ where }),
        ]);

        return {
            data,
            pagination: {
                page: currentPage,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    async getTrip(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        const trip = await this.prisma.tripTemplate.findFirst({
            where: { id, agencyId: req.tenantId },
            include: {
                sessions: {
                    include: {
                        _count: { select: { bookings: true } },
                    },
                    orderBy: { startDate: 'asc' },
                },
                itinerary: { orderBy: { dayNumber: 'asc' } },
            },
        });
        if (!trip) {
            throw new NotFoundException('Trip template not found');
        }
        return trip;
    }

    async getBookings(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const currentPage = parsePage(page);
        const skip = (currentPage - 1) * take;

        // #786: optional pipeline-stage filter used by the CRM board.
        // Validated against the booking status enum — an unknown value
        // is a client error, never silently ignored.
        if (status !== undefined && !(CRM_PIPELINE_STATUSES as readonly string[]).includes(status)) {
            throw new BadRequestException(`Unknown booking status: ${status}`);
        }

        const bookingsWhere: any = {
            session: {
                template: { agencyId }
            },
        };
        if (status !== undefined) {
            bookingsWhere.status = status;
        }

        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                where: bookingsWhere,
                include: {
                    session: {
                        include: {
                            template: {
                                include: {
                                    agency: true,
                                },
                            },
                        }
                    },
                    traveler: {
                        select: {
                            name: true,
                            email: true,
                        }
                    },
                    paymentProof: true,
                    paymentPlan: true,
                    // #422: lets mapBookingDetails embed the proof's
                    // bank-confirmation state (see booking-response.util).
                    externalPayments: { select: BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT }
                },
                orderBy: {
                    bookingDate: 'desc'
                },
                skip,
                take,
            }),
            this.prisma.booking.count({ where: bookingsWhere }),
        ]);

        return {
            data: bookings.map((booking) => mapBookingDetails(booking)),
            pagination: {
                total,
                page: currentPage,
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    // #786 (Council S6 Phase 3, smallest useful slice): agency CRM —
    // contacts + booking pipeline derived from the agency's OWN
    // bookings. Tenant isolation is structural, exactly like the #780
    // exports: every query is scoped by req.tenantId (stamped by
    // TenantGuard from the authenticated principal) plus the row-level
    // agencyId tenant stamp (#428). No agency id, and no traveller id,
    // is ever accepted from the request, so there is no cross-agency
    // or cross-traveller surface. No new personal data is collected:
    // a contact is the traveller's bookings with this agency,
    // aggregated. Amounts are display-only sums of booking totals —
    // travellers pay the agency directly; Ouiboo holds no funds here.
    async getCrmContacts(
        @Request() req: AuthenticatedRequest,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const currentPage = parsePage(page);

        const bookings = await this.prisma.booking.findMany({
            where: { agencyId },
            select: {
                travelerId: true,
                status: true,
                totalAmount: true,
                bookingDate: true,
                fullName: true,
                phoneNumber: true,
                traveler: { select: { name: true, email: true } },
                session: { select: { templateId: true } },
            },
            orderBy: { bookingDate: 'desc' },
            take: CRM_MAX_BOOKINGS,
        });

        let contacts = aggregateCrmContacts(bookings as any);
        const needle = search?.trim().toLowerCase();
        if (needle) {
            contacts = contacts.filter((contact) =>
                [contact.name, contact.email, contact.phone]
                    .filter(Boolean)
                    .some((value) => value!.toLowerCase().includes(needle)),
            );
        }

        const total = contacts.length;
        const skip = (currentPage - 1) * take;
        return {
            data: contacts.slice(skip, skip + take),
            pagination: {
                total,
                page: currentPage,
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    async getCrmPipeline(@Request() req: AuthenticatedRequest) {
        const agencyId = req.tenantId;

        const [grouped, refundTotal, refundOpen] = await Promise.all([
            this.prisma.booking.groupBy({
                by: ['status'],
                where: { agencyId },
                _count: { _all: true },
                _sum: { totalAmount: true },
            }),
            this.prisma.refundCase.count({ where: { agencyId } }),
            this.prisma.refundCase.count({
                where: {
                    agencyId,
                    status: { notIn: ['REFUND_COMPLETED', 'REFUND_REJECTED'] },
                },
            }),
        ]);

        return aggregateCrmPipeline(
            grouped.map((row: any) => ({
                status: row.status,
                count: row._count?._all ?? 0,
                totalAmount: row._sum?.totalAmount ?? null,
            })),
            { open: refundOpen, total: refundTotal },
        );
    }

    // #780 (Council S6 Phase 3): self-serve CSV export of the agency's OWN
    // data. Tenant isolation is structural: every query is scoped by
    // req.tenantId — the agency id stamped by TenantGuard from the
    // authenticated principal — plus the row-level agencyId tenant stamp
    // (#428). No agency id is ever accepted from the request.
    async exportBookings(@Request() req: AuthenticatedRequest, @Res() res: Response) {
        const agencyId = req.tenantId;
        const bookings = await this.prisma.booking.findMany({
            where: { agencyId },
            include: {
                session: {
                    include: {
                        template: { select: { title: true } },
                    },
                },
                traveler: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                paymentPlan: {
                    select: {
                        depositAmount: true,
                        balanceAmount: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: EXPORT_MAX_ROWS,
        });
        return sendCsv(res, exportFilename('bookings'), bookingsToCsv(bookings as any));
    }

    async exportTrips(@Request() req: AuthenticatedRequest, @Res() res: Response) {
        const agencyId = req.tenantId;
        const trips = await this.prisma.tripTemplate.findMany({
            where: { agencyId },
            include: {
                _count: { select: { sessions: true } },
                sessions: {
                    select: { price: true },
                    orderBy: { startDate: 'asc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: EXPORT_MAX_ROWS,
        });
        return sendCsv(res, exportFilename('trips'), tripsToCsv(trips as any));
    }

    async exportReviews(@Request() req: AuthenticatedRequest, @Res() res: Response) {
        const agencyId = req.tenantId;
        // Unlike the on-screen list (VISIBLE only), the export is the
        // agency's own record of every review it received, so all
        // moderation states are included and labelled in the CSV.
        const reviews = await this.prisma.review.findMany({
            where: { agencyId },
            include: {
                traveler: {
                    select: {
                        name: true,
                    },
                },
                tripTemplate: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: EXPORT_MAX_ROWS,
        });
        return sendCsv(res, exportFilename('reviews'), reviewsToCsv(reviews as any));
    }

    async getPaymentsOverview(@Request() req: AuthenticatedRequest) {
        return this.externalPaymentsService.getAgencyPaymentsOverview(req.tenantId!);
    }

    async getPayments(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.externalPaymentsService.listAgencyPayments(
            req.tenantId!,
            parsePage(page),
            clampListLimit(limit, 20),
        );
    }

    async getReviews(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const skip = (parsePage(page) - 1) * take;
        // #393: rating aggregates and lists count VISIBLE reviews only;
        // HIDDEN / REMOVED reviews are excluded everywhere.
        const where = {
            tripTemplate: { agencyId },
            status: 'VISIBLE' as const
        };

        const [reviews, aggregate, pendingResponses] = await Promise.all([
            this.prisma.review.findMany({
                where,
                include: {
                    traveler: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    booking: {
                        include: {
                            session: {
                                include: {
                                    template: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.review.aggregate({
                where,
                _avg: { rating: true },
                _count: { _all: true },
            }),
            this.prisma.review.count({
                where: { ...where, response: null },
            }),
        ]);

        // Transform to match frontend expectations
        const transformedReviews = reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            response: r.response,
            // #692: the reply's moderation state — the agency sees its
            // reply as PENDING until an admin approves it to VISIBLE.
            responseStatus: r.responseStatus ?? null,
            isVerifiedBooking: r.isVerifiedBooking,
            createdAt: r.createdAt,
            // #447: the traveller avatar is a stored file reference —
            // re-derive it against the current public media base.
            traveler: r.traveler
                ? { ...r.traveler, avatar: derivePublicMediaUrl(r.traveler.avatar) }
                : r.traveler,
            trip: {
                id: r.booking.session.template.id,
                title: r.booking.session.template.title
            }
        }));

        const totalReviews = aggregate._count._all;
        const averageRating = aggregate._avg.rating || 0;
        const respondedCount = totalReviews - pendingResponses;
        const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

        return {
            reviews: transformedReviews,
            stats: {
                totalReviews,
                averageRating: Number(averageRating.toFixed(1)),
                pendingResponses,
                responseRate
            }
        };
    }

    async getReviewStats(@Request() req: AuthenticatedRequest) {
        const agencyId = req.tenantId;
        // #393: VISIBLE reviews only (see getReviews above).
        const where = {
            tripTemplate: { agencyId },
            status: 'VISIBLE' as const
        };
        const [aggregate, pendingResponses] = await Promise.all([
            this.prisma.review.aggregate({
                where,
                _avg: { rating: true },
                _count: { _all: true },
            }),
            this.prisma.review.count({
                where: { ...where, response: null },
            }),
        ]);

        const totalReviews = aggregate._count._all;
        const averageRating = aggregate._avg.rating || 0;
        const respondedCount = totalReviews - pendingResponses;
        const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

        return {
            totalReviews,
            averageRating: Number(averageRating.toFixed(1)),
            pendingResponses,
            responseRate
        };
    }
}
