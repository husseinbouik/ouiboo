import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type Prisma } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { buildCancellationScaleSnapshot, parseCancellationScale } from '../cancellation/cancellation.util';
import { toMoneyString } from '../common/money.util';
import { canOrganise } from '../common/agency-licence.util';
import { isDestinationSlug } from '../trips/destinations.util';
import { CreateCustomTripOfferDto, CreateCustomTripRequestDto } from './dto/custom-trip.dto';
import {
    CUSTOM_TRIP_REQUEST_TTL_DAYS,
    generateCustomTripPublicRef,
    isCustomTripExpired,
    isCustomTripRequestsEnabled,
    toAgencyCustomTripView,
} from './custom-trips.util';

/**
 * #684 (Council S6): custom-trip requests — lead distribution ONLY.
 *
 * Ouiboo routes a traveller-authored request to matched verified
 * cluster agencies (pseudonymised), transmits agency quotes UNCHANGED,
 * snapshots the accepted quote, and converts acceptance into a
 * private/unlisted Trip the traveller books through the ordinary
 * staged agency-direct flow. Ouiboo never prices, marks up,
 * assembles, collects, or is named organiser/seller.
 *
 * The whole service fails closed behind CUSTOM_TRIP_REQUESTS_ENABLED
 * (default OFF): every entry point 404s while the flag is off.
 */
@Injectable()
export class CustomTripsService {
    constructor(private db: DatabaseService) { }

    assertEnabled() {
        if (!isCustomTripRequestsEnabled()) {
            throw new NotFoundException('Not found');
        }
    }

    private async expireIfNeeded(row: { id: string; status: string; expiresAt: Date | string }) {
        if (isCustomTripExpired(row)) {
            await this.db.customTripRequest.update({
                where: { id: row.id },
                data: { status: 'EXPIRED' },
            }).catch(() => undefined);
            return 'EXPIRED';
        }
        return row.status;
    }

    /**
     * Matched agencies for a request: VERIFIED, ODV (can organise),
     * with at least one ACTIVE listed trip in the request's cluster
     * destination (or any cluster destination when the request names
     * none). Matching is computed from live inventory, never stored.
     */
    private async matchedAgencyIds(destinationSlug: string | null): Promise<string[]> {
        const templates = await this.db.tripTemplate.findMany({
            where: {
                status: 'ACTIVE',
                isUnlisted: false,
                ...(destinationSlug ? { destinationSlug } : { destinationSlug: { not: null } }),
                agency: { verificationStatus: 'VERIFIED' },
            },
            select: { agencyId: true, agency: { select: { travelLicenceType: true } } },
        });
        const ids = new Set<string>();
        for (const t of templates) {
            if (canOrganise(t.agency as never)) ids.add(t.agencyId);
        }
        return [...ids];
    }

    private mapOffer(row: any) {
        return {
            id: row.id,
            requestId: row.requestId,
            agencyId: row.agencyId,
            agency: row.agency ? { id: row.agency.id, companyName: row.agency.companyName } : null,
            quotedTotalAmount: toMoneyString(row.quotedTotalAmount) ?? '0.00',
            quotedCurrency: row.quotedCurrency || 'MAD',
            quoteNote: row.quoteNote ?? null,
            cancellationScale: row.cancellationScale ?? null,
            status: row.status,
            quotedAt: new Date(row.quotedAt).toISOString(),
            acceptedAt: row.acceptedAt ? new Date(row.acceptedAt).toISOString() : null,
        };
    }

    private mapMine(row: any) {
        return {
            id: row.id,
            publicRef: row.publicRef,
            travelerId: row.travelerId,
            title: row.title,
            description: row.description ?? null,
            category: row.category,
            destinationSlug: row.destinationSlug ?? null,
            startLocation: row.startLocation ?? null,
            requestedStartDate: new Date(row.requestedStartDate).toISOString(),
            requestedEndDate: new Date(row.requestedEndDate).toISOString(),
            guestsCount: row.guestsCount,
            budgetMaxMad: toMoneyString(row.budgetMaxMad) ?? null,
            note: row.note ?? null,
            status: row.status,
            expiresAt: new Date(row.expiresAt).toISOString(),
            acceptedOfferId: row.acceptedOfferId ?? null,
            convertedTemplateId: row.convertedTemplate?.id ?? null,
            offers: (row.offers ?? []).map((offer: any) => this.mapOffer(offer)),
            createdAt: new Date(row.createdAt).toISOString(),
            updatedAt: new Date(row.updatedAt).toISOString(),
        };
    }

    async create(travelerId: string, dto: CreateCustomTripRequestDto) {
        this.assertEnabled();
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
            throw new BadRequestException('The requested end date must be on or after the start date');
        }
        if (dto.destinationSlug && !isDestinationSlug(dto.destinationSlug)) {
            throw new BadRequestException(
                'destinationSlug must be one of the configured destinations (tangier, tetouan, chefchaouen)',
            );
        }
        const expiresAt = new Date(Date.now() + CUSTOM_TRIP_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000);
        // Public-ref collisions are improbable; retry a few times.
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const row = await this.db.customTripRequest.create({
                    data: {
                        publicRef: generateCustomTripPublicRef(),
                        travelerId,
                        title: dto.title.trim(),
                        description: dto.description?.trim() || null,
                        category: (dto.category ?? 'CULTURAL') as never,
                        destinationSlug: dto.destinationSlug ?? null,
                        startLocation: dto.startLocation?.trim() || null,
                        requestedStartDate: start,
                        requestedEndDate: end,
                        guestsCount: dto.guestsCount,
                        budgetMaxMad: dto.budgetMaxMad ?? null,
                        note: dto.note?.trim() || null,
                        expiresAt,
                    },
                    include: { offers: { include: { agency: { select: { id: true, companyName: true } } } }, convertedTemplate: { select: { id: true } } },
                });
                return this.mapMine(row);
            } catch (error) {
                if ((error as { code?: string })?.code !== 'P2002' || attempt === 4) throw error;
            }
        }
        throw new ConflictException('Could not allocate a request reference');
    }

    async listMine(travelerId: string) {
        this.assertEnabled();
        const rows = await this.db.customTripRequest.findMany({
            where: { travelerId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                offers: { include: { agency: { select: { id: true, companyName: true } } }, orderBy: { createdAt: 'asc' } },
                convertedTemplate: { select: { id: true } },
            },
        });
        for (const row of rows) row.status = (await this.expireIfNeeded(row)) as never;
        return rows.map((row) => this.mapMine(row));
    }

    private async resolveAgencyId(userId: string): Promise<string> {
        const profile = await this.db.agencyProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!profile) throw new ForbiddenException('Agency profile not found');
        return profile.id;
    }

    /** Pseudonymised inbox: ONLY requests this agency is matched to. */
    async listForAgency(userId: string) {
        this.assertEnabled();
        const agencyId = await this.resolveAgencyId(userId);
        const rows = await this.db.customTripRequest.findMany({
            where: { status: { in: ['PENDING', 'QUOTED', 'ACCEPTED', 'CONVERTED'] } },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                offers: {
                    where: { agencyId },
                    include: { agency: { select: { id: true, companyName: true } } },
                },
                convertedTemplate: { select: { id: true } },
                traveler: { select: { email: true, name: true } },
                _count: { select: { offers: true } },
            },
        });
        const visible: any[] = [];
        for (const row of rows) {
            const matched = await this.matchedAgencyIds(row.destinationSlug);
            if (!matched.includes(agencyId)) continue;
            row.status = (await this.expireIfNeeded(row)) as never;
            if (row.status === 'EXPIRED') continue;
            const isAcceptedAgency = row.acceptedOfferId
                ? (row.offers as any[]).some((o) => o.id === row.acceptedOfferId)
                    || !!(await this.db.customTripOffer.findFirst({
                        where: { id: row.acceptedOfferId, agencyId },
                        select: { id: true },
                    }))
                : false;
            visible.push({
                ...toAgencyCustomTripView(row as never, { revealIdentity: isAcceptedAgency }),
                offers: (row.offers as any[]).map((offer) => this.mapOffer(offer)),
                offerCount: (row as any)._count?.offers ?? 0,
            });
        }
        return visible;
    }

    async getForAgency(userId: string, id: string) {
        this.assertEnabled();
        const agencyId = await this.resolveAgencyId(userId);
        const row = await this.db.customTripRequest.findUnique({
            where: { id },
            include: {
                offers: { include: { agency: { select: { id: true, companyName: true } } }, orderBy: { createdAt: 'asc' } },
                convertedTemplate: { select: { id: true } },
                traveler: { select: { email: true, name: true } },
            },
        });
        if (!row) throw new NotFoundException('Custom trip request not found');
        const matched = await this.matchedAgencyIds(row.destinationSlug);
        if (!matched.includes(agencyId)) {
            // Unmatched agencies cannot even learn the request exists.
            throw new NotFoundException('Custom trip request not found');
        }
        row.status = (await this.expireIfNeeded(row)) as never;
        const acceptedOffer = row.acceptedOfferId
            ? (row.offers as any[]).find((o) => o.id === row.acceptedOfferId)
            : null;
        const revealIdentity = !!acceptedOffer && acceptedOffer.agencyId === agencyId
            && (row.status === 'ACCEPTED' || row.status === 'CONVERTED');
        return {
            ...toAgencyCustomTripView(row as never, { revealIdentity }),
            // Other agencies' quotes are visible as amounts only after
            // acceptance? No — quotes are the agencies' own commercial
            // data: an agency sees ONLY its own offer on a request.
            offers: (row.offers as any[])
                .filter((offer) => offer.agencyId === agencyId)
                .map((offer) => this.mapOffer(offer)),
            offerCount: (row.offers as any[]).length,
        };
    }

    /** Agency firm quote — transmitted UNCHANGED, never re-priced. */
    async createOffer(userId: string, requestId: string, dto: CreateCustomTripOfferDto) {
        this.assertEnabled();
        const agencyId = await this.resolveAgencyId(userId);
        const row = await this.db.customTripRequest.findUnique({ where: { id: requestId } });
        if (!row) throw new NotFoundException('Custom trip request not found');
        const matched = await this.matchedAgencyIds(row.destinationSlug);
        if (!matched.includes(agencyId)) {
            throw new NotFoundException('Custom trip request not found');
        }
        row.status = (await this.expireIfNeeded(row)) as never;
        if (row.status !== 'PENDING' && row.status !== 'QUOTED') {
            throw new BadRequestException('This request is no longer open for quotes');
        }
        const amount = Number(dto.totalAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException('The firm total must be a positive amount in MAD');
        }
        let scale: unknown;
        if (dto.cancellationBands) {
            const parsed = parseCancellationScale({ bands: dto.cancellationBands });
            if (!parsed) {
                throw new BadRequestException(
                    'The cancellation scale is invalid — provide bands of { minDaysBeforeStart, refundPercent } covering 0 days',
                );
            }
            scale = buildCancellationScaleSnapshot({ bands: dto.cancellationBands });
        } else {
            scale = buildCancellationScaleSnapshot(null);
        }
        try {
            const offer = await this.db.customTripOffer.create({
                data: {
                    requestId,
                    agencyId,
                    quotedTotalAmount: dto.totalAmount,
                    quotedCurrency: 'MAD',
                    quoteNote: dto.note?.trim() || null,
                    cancellationScale: scale as Prisma.InputJsonValue,
                },
                include: { agency: { select: { id: true, companyName: true } } },
            });
            if (row.status === 'PENDING') {
                await this.db.customTripRequest.update({
                    where: { id: requestId },
                    data: { status: 'QUOTED' },
                });
            }
            return this.mapOffer(offer);
        } catch (error) {
            if ((error as { code?: string })?.code === 'P2002') {
                throw new ConflictException('This agency has already quoted on this request');
            }
            throw error;
        }
    }

    /**
     * Traveller acceptance: snapshot the quote immutably, reveal the
     * traveller's identity to the accepted agency (by making the
     * ACCEPTED state readable through getForAgency), and convert the
     * request into a private/unlisted Trip (DRAFT) owned by the
     * accepted agency — booking then runs on the existing machinery
     * once the agency adds a session and publishes it to the traveller.
     */
    async accept(travelerId: string, requestId: string, offerId: string) {
        this.assertEnabled();
        const result = await this.db.$transaction(async (tx) => {
            const row = await tx.customTripRequest.findUnique({ where: { id: requestId } });
            if (!row) throw new NotFoundException('Custom trip request not found');
            if (row.travelerId !== travelerId) {
                throw new ForbiddenException('This request belongs to another traveller');
            }
            if (row.status === 'ACCEPTED' || row.status === 'CONVERTED') {
                throw new BadRequestException('This request was already accepted — the accepted quote is final');
            }
            if (row.status !== 'QUOTED') {
                throw new BadRequestException('Only a quoted request can be accepted');
            }
            if (isCustomTripExpired(row)) {
                await tx.customTripRequest.update({ where: { id: requestId }, data: { status: 'EXPIRED' } });
                throw new BadRequestException('This request has expired');
            }
            const offer = await tx.customTripOffer.findFirst({
                where: { id: offerId, requestId },
            });
            if (!offer) throw new NotFoundException('Offer not found');
            if (offer.status !== 'QUOTED') {
                throw new BadRequestException('This offer is no longer open');
            }
            const acceptedAt = new Date();
            const snapshot = {
                quotedTotalAmount: toMoneyString(offer.quotedTotalAmount) || '0.00',
                quotedCurrency: offer.quotedCurrency || 'MAD',
                cancellationScale: (offer.cancellationScale as unknown) ?? null,
                quotedAt: new Date(offer.quotedAt).toISOString(),
                acceptedAt: acceptedAt.toISOString(),
                requestId,
                agencyId: offer.agencyId,
                offerId: offer.id,
            };
            await tx.customTripOffer.update({
                where: { id: offer.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt,
                    acceptedSnapshot: snapshot as Prisma.InputJsonValue,
                },
            });
            await tx.customTripOffer.updateMany({
                where: { requestId, id: { not: offer.id }, status: 'QUOTED' },
                data: { status: 'DECLINED' },
            });
            // Conversion: the private/unlisted Trip. The agency
            // completes it (itinerary, meeting point, session) in the
            // ordinary editor; publish gates apply unchanged.
            const scale = (offer.cancellationScale ?? null) as { bands?: unknown } | null;
            const durationDays = Math.max(
                1,
                Math.round((new Date(row.requestedEndDate).getTime() - new Date(row.requestedStartDate).getTime()) / 86400000) + 1,
            );
            const template = await tx.tripTemplate.create({
                data: {
                    agencyId: offer.agencyId,
                    title: row.title,
                    description: row.description ?? '',
                    category: row.category,
                    startLocation: row.startLocation ?? '',
                    destinationSlug: row.destinationSlug,
                    durationDays,
                    durationNights: Math.max(0, durationDays - 1),
                    inclusions: [],
                    exclusions: [],
                    checklist: [],
                    images: [],
                    status: 'DRAFT',
                    currency: 'MAD',
                    isUnlisted: true,
                    customTripRequestId: requestId,
                    cancellationPolicy: scale?.bands
                        ? ({ version: 'cancellation-v1', bands: scale.bands } as unknown as Prisma.InputJsonValue)
                        : undefined,
                    translations: {
                        fr: { title: row.title, description: row.description ?? '' },
                    } as unknown as Prisma.InputJsonValue,
                },
            });
            const updated = await tx.customTripRequest.update({
                where: { id: requestId },
                data: { status: 'CONVERTED', acceptedOfferId: offer.id },
                include: {
                    offers: { include: { agency: { select: { id: true, companyName: true } } }, orderBy: { createdAt: 'asc' } },
                    convertedTemplate: { select: { id: true } },
                },
            });
            return { request: updated, templateId: template.id };
        });
        return { ...this.mapMine(result.request), convertedTemplateId: result.templateId };
    }

    async cancel(travelerId: string, requestId: string) {
        this.assertEnabled();
        const row = await this.db.customTripRequest.findUnique({ where: { id: requestId } });
        if (!row) throw new NotFoundException('Custom trip request not found');
        if (row.travelerId !== travelerId) {
            throw new ForbiddenException('This request belongs to another traveller');
        }
        if (row.status === 'ACCEPTED' || row.status === 'CONVERTED') {
            throw new BadRequestException('An accepted request cannot be cancelled here');
        }
        if (row.status !== 'PENDING' && row.status !== 'QUOTED') {
            throw new BadRequestException('This request is already closed');
        }
        const updated = await this.db.customTripRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED' },
            include: { offers: true, convertedTemplate: { select: { id: true } } },
        });
        return this.mapMine(updated);
    }

    async withdrawOffer(userId: string, requestId: string, offerId: string) {
        this.assertEnabled();
        const agencyId = await this.resolveAgencyId(userId);
        const offer = await this.db.customTripOffer.findFirst({ where: { id: offerId, requestId } });
        if (!offer) throw new NotFoundException('Offer not found');
        if (offer.agencyId !== agencyId) {
            throw new ForbiddenException('This offer belongs to another agency');
        }
        if (offer.status !== 'QUOTED') {
            throw new BadRequestException('Only an open quote can be withdrawn');
        }
        const updated = await this.db.customTripOffer.update({
            where: { id: offerId },
            data: { status: 'WITHDRAWN' },
            include: { agency: { select: { id: true, companyName: true } } },
        });
        return this.mapOffer(updated);
    }
}
