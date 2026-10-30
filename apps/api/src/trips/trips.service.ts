import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripSessionDto } from './dto/create-trip.dto';
import { BookingPaymentStatus, BookingStatus, Prisma, SessionStatus, TripStatus } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';
import { canOrganise, effectiveVerificationStatus, getAgencyActivationBlock, sellerBlockMissingFields } from '../common/agency-licence.util';
import { visibleBankDetails } from '../common/bank-details.util';
import { BETA_CATALOG_CURRENCY, isCatalogCurrencyAllowed, isMadOnlyCatalogEnabled } from '../common/catalog-currency.util';
import { resolveStagedSessionConfig } from '../staged-payments/staged-payments.util';
import {
    buildCancellationScaleSnapshot,
    normalizeCancellationPolicyInput,
} from '../cancellation/cancellation.util';
import {
    buildTripTranslations,
    frenchSectionsMissing,
    hasCompleteFrenchText,
    localizeTripPayload,
    normalizeTripTranslations,
    type TripCanonicalSections,
} from './trip-translations.util';
import { deriveDestinationSlug, isDestinationSlug } from './destinations.util';
import {
    assertCommercialTermsPublishable,
    assertMeetingPointPublishable,
    collectTripTexts,
    findProhibitedCommercialTerms,
    itineraryCompletenessWarnings,
    normalizeMeetingPoint,
    publicMeetingPoint,
    type MeetingPoint,
} from './publish-guardrails.util';
import { derivePublicMediaUrl, derivePublicMediaUrls } from '../upload/media-url.util';

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
                licenceIssuedAt: true,
                licenceIssuingAuthority: true,
            },
        });
        const block = agency ? getAgencyActivationBlock(agency) : 'Agency profile not found';
        if (block) throw new ForbiddenException(block);
        if (agency && !canOrganise(agency)) {
            throw new ForbiddenException(
                'A distributor (DV) licence does not permit organising trips — only ODV agencies can publish trips',
            );
        }
        // Session #3 P0-13 (#415): the Law 31-08 seller block cannot be
        // rendered completely without the licence ISSUE DATE and ISSUING
        // AUTHORITY. A verified legacy record missing either keeps its
        // already-ACTIVE trips (the gate only runs on transitions in),
        // but may not publish new ones until the record is complete —
        // the same facts the traveller side must now state honestly
        // (SellerIdentity's not-confirmed line) instead of omitting.
        if (agency) {
            const missingIssueFields = sellerBlockMissingFields(agency).filter(
                (field) => field === 'licenceIssuedAt' || field === 'licenceIssuingAuthority',
            );
            if (missingIssueFields.length > 0) {
                throw new ForbiddenException(
                    'The agency licence record is incomplete — the licence issue date and issuing authority are required before trips can be published',
                );
            }
        }
    }

    /**
     * #546: French content gate. French is the canonical language of a
     * trip (the `title`/`description` columns ARE the French text), and
     * a trip may only enter the marketplace with a complete French
     * title + description. Drafts may be incomplete in every language;
     * Arabic/English are encouraged but never block publishing.
     */
    private assertFrenchPublishable(trip: {
        title?: string | null;
        description?: string | null;
        translations?: unknown;
    } & TripCanonicalSections) {
        if (!hasCompleteFrenchText(trip)) {
            throw new BadRequestException(
                'A French title and description are required to publish a trip',
            );
        }
        // #584 (phase 2): the same French-required rule covers the
        // sections — a day or list that exists in any language must
        // exist in French before the trip can publish.
        const missingSections = frenchSectionsMissing(trip);
        if (missingSections.length > 0) {
            throw new BadRequestException(
                `French section content is required to publish a trip (missing: ${missingSections.join(', ')})`,
            );
        }
    }

    /**
     * #675: resolve the destination slug for a write. A supplied slug
     * must come from the BETA_DESTINATIONS configuration (anything else
     * is a client error); an omitted slug is derived from the
     * startLocation text; an explicit null clears the stamp.
     */
    private resolveDestinationSlug(
        supplied: string | null | undefined,
        startLocation: string | null | undefined,
    ): string | null | undefined {
        if (supplied !== undefined) {
            if (supplied === null) return null;
            if (!isDestinationSlug(supplied)) {
                throw new BadRequestException(
                    `destinationSlug must be one of the configured destinations (tangier, tetouan, chefchaouen)`,
                );
            }
            return supplied;
        }
        // Omitted: derive from the (post-write) startLocation. A null
        // derivation clears a stale stamp on update; createTemplate
        // converts that null back to undefined (nothing to clear).
        return deriveDestinationSlug(startLocation);
    }

    /**
     * Council S6 Batch B publish gates (#674 + #676), evaluated on the
     * POST-WRITE state of a trip entering (or staying in) the
     * marketplace: exactly one structured cancellation scale, no
     * free-text cancellation/payment terms anywhere in the trip text,
     * and a meeting address or pickup. Like the licence/French gates,
     * these run on transitions into ACTIVE (and, for the free-text
     * scan, on text edits to already-ACTIVE trips) — already-published
     * trips are never retro-blocked by an unrelated edit.
     */
    private assertBatchBPublishable(trip: {
        cancellationPolicy?: unknown;
        meetingPoint?: unknown;
        title?: string | null;
        description?: string | null;
        inclusions?: string[] | null;
        exclusions?: string[] | null;
        checklist?: string[] | null;
        itinerary?: Array<{ title?: string | null; description?: string | null; activities?: string[] | null }> | null;
        translations?: unknown;
    }) {
        assertCommercialTermsPublishable({
            cancellationPolicy: trip.cancellationPolicy,
            texts: collectTripTexts(trip),
        });
        assertMeetingPointPublishable(normalizeMeetingPoint(trip.meetingPoint));
    }

    /** Stored meeting points were validated on write; a malformed
     * legacy value degrades to null rather than failing a read. */
    private safeMeetingPoint(raw: unknown): MeetingPoint | null {
        try {
            return normalizeMeetingPoint(raw);
        } catch {
            return null;
        }
    }

    /** #676: non-blocking completeness warnings for a publish response. */
    private publishWarningsFor(days: Array<{
        dayNumber: number;
        driveTimeMinutes?: number | null;
        accommodationName?: string | null;
        accommodationType?: string | null;
        mealsIncluded?: string[] | null;
    }> | null | undefined): string[] {
        return itineraryCompletenessWarnings(days);
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

        const { itinerary, imageAlts, cancellationPolicy, translations, destinationSlug, meetingPoint, ...tripData } = dto;

        const data = {
            ...tripData,
            // #675: stamp the normalised destination (supplied slug
            // validated against the configuration, else derived from
            // startLocation; non-cluster trips stay unstamped).
            destinationSlug:
                this.resolveDestinationSlug(destinationSlug, dto.startLocation) ?? undefined,
            // #676: normalized structured meeting point (absent when
            // the agency has not provided any part of it yet — drafts
            // may be incomplete; publishing is gated in
            // publish-guardrails).
            meetingPoint: normalizeMeetingPoint(meetingPoint)
                ? (normalizeMeetingPoint(meetingPoint) as unknown as Prisma.InputJsonValue)
                : undefined,
            // #417 (Council P0-11): validate + normalize the agency's
            // cancellation bands before they are stored as structured
            // data (throws on coverage gaps / duplicates / bad ranges).
            cancellationPolicy: cancellationPolicy
                ? (normalizeCancellationPolicyInput(cancellationPolicy) as unknown as Prisma.InputJsonValue)
                : undefined,
            // #546: persist the language map; its `fr` entry mirrors
            // the canonical title/description columns from this write.
            translations: buildTripTranslations(translations, {
                title: dto.title,
                description: dto.description,
                // #584: canonical sections mirror into the map's `fr`
                // entry; other languages' days align by dayNumber.
                itinerary,
                inclusions: dto.inclusions,
                exclusions: dto.exclusions,
                checklist: dto.checklist,
            }) as unknown as Prisma.InputJsonValue,
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
        destination?: string;
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
        // #546: request locale for resolving title/description from
        // the translations map (fallback: French, then any language).
        locale?: string;
    }) {
        try {
            const {
                featured,
                q,
                category,
                destination,
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
                locale,
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
            // #675: destination facet — the slug must come from the
            // BETA_DESTINATIONS configuration; an unknown slug is a
            // client error, never a silent empty page.
            if (destination) {
                if (!isDestinationSlug(destination)) {
                    throw new BadRequestException(
                        `destination must be one of the configured destinations (tangier, tetouan, chefchaouen)`,
                    );
                }
                where.destinationSlug = destination;
            }
            if (agencyId) where.agencyId = agencyId;
            if (currency) where.currency = currency;
            // B24(f) / #498: while the MAD-only beta gate is on, the
            // public catalogue never lists a non-MAD trip. An explicit
            // non-MAD currency filter intersects to an empty page.
            if (isMadOnlyCatalogEnabled()) {
                if (where.currency && where.currency !== BETA_CATALOG_CURRENCY) {
                    return {
                        data: [],
                        pagination: { total: 0, page: safePage, limit: safeLimit, totalPages: 0 },
                    };
                }
                where.currency = BETA_CATALOG_CURRENCY;
            }
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
                const orConditions: any[] = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { startLocation: { contains: search, mode: 'insensitive' } },
                    // #440 (Council P1-15): the destination city must be
                    // searchable too — a trip ENDING in the searched city
                    // previously returned 0 results because endLocation was
                    // missing from the OR set.
                    { endLocation: { contains: search, mode: 'insensitive' } },
                ];
                // #546: also match the localized texts. The French columns
                // above stay the primary match (no search regression for
                // legacy trips). Prisma's Json filters cannot
                // substring-match inside an object-valued Json column, so
                // the matching template ids are resolved with one bounded
                // raw query over the serialized translations map.
                // Best-effort: if that query is unavailable (e.g. a
                // pre-migration database), search degrades to French-only
                // instead of failing.
                try {
                    const rows = await this.db.$queryRaw<Array<{ id: string }>>(
                        Prisma.sql`SELECT "id" FROM "TripTemplate" WHERE "translations"::text ILIKE ${`%${search}%`} LIMIT 500`,
                    );
                    const translationMatchIds = (rows ?? []).map((row) => row.id).filter(Boolean);
                    if (translationMatchIds.length > 0) {
                        orConditions.push({ id: { in: translationMatchIds } });
                    }
                } catch {
                    // translations search unavailable — French-only matching.
                }
                where.OR = orConditions;
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
                                // #569: the expiries feed the umbrella
                                // reconciliation below; they are stripped
                                // from the payload, never exposed.
                                licenceExpiry: true,
                                insuranceExpiry: true,
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
                // #546: resolve title/description into the request
                // locale (fallback French -> any language). Without a
                // locale this resolves to the French columns, i.e. the
                // payload is byte-identical to the pre-#546 shape.
                // #447: media URLs are re-derived from the stored file
                // references against the CURRENT public base on every read
                // (stored full URLs are provider-coupled — #411).
                data: templates.map((template) => {
                    const localized = localizeTripPayload(template, locale);
                    const images = derivePublicMediaUrls((template as any).images);
                    // #676: public payloads carry the meeting AREA only —
                    // the exact address / maps link never leave on a
                    // pre-booking surface.
                    const meetingPoint = publicMeetingPoint(
                        this.safeMeetingPoint((template as any).meetingPoint),
                        template.startLocation,
                    );
                    if (!localized.agency) return { ...localized, images, meetingPoint };
                    // #569: never publish an umbrella VERIFIED the
                    // components do not support — reconcile on read.
                    // #673 (Council S6): the licence EXPIRY is part of the
                    // dated verification statement the card renders
                    // (status + expiry + verified-at), so it is exposed;
                    // the insurance expiry stays an internal
                    // reconciliation input and is still stripped.
                    const { insuranceExpiry: _insuranceExpiry, ...agency } =
                        localized.agency as typeof localized.agency & { licenceExpiry?: unknown; insuranceExpiry?: unknown };
                    return {
                        ...localized,
                        images,
                        meetingPoint,
                        agency: {
                            ...agency,
                            // #447: logo re-derived at read time like trip images.
                            logo: derivePublicMediaUrl((template as any).agency.logo) ?? null,
                            verificationStatus: effectiveVerificationStatus(localized.agency),
                        },
                    };
                }),
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

    async findOneTemplate(id: string, locale?: string) {
        const result = await this.db.tripTemplate.findFirst({
            where: {
                id,
                status: TripStatus.ACTIVE,
                agency: { verificationStatus: 'VERIFIED' },
                // B24(f) / #498: a non-MAD trip is not publicly visible
                // while the beta gate is on — same NotFound as absent.
                ...(isMadOnlyCatalogEnabled() ? { currency: BETA_CATALOG_CURRENCY } : {}),
            },
            select: {
                id: true,
                title: true,
                description: true,
                // #546: the language map rides along so the payload can
                // be resolved into the request locale below (and so
                // clients can see which languages exist).
                translations: true,
                category: true,
                startLocation: true,
                // #675 + #676: destination slug rides along; the meeting
                // point is selected so it can be re-shaped to area-only
                // below (the stored address/maps link are NOT selected
                // into the public payload).
                destinationSlug: true,
                meetingPoint: true,
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
                        // #569: feeds the umbrella reconciliation below;
                        // stripped from the payload, never exposed.
                        insuranceExpiry: true,
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
        const { bankDetailsVerifiedAt: _verificationStamp, insuranceExpiry: _insuranceExpiry, ...publicAgency } = result.agency;
        // #546: resolve title/description into the request locale
        // (fallback French -> any language; no locale = French columns,
        // identical to the pre-#546 payload).
        const localized = localizeTripPayload(result, locale);
        return {
            ...localized,
            // #676: area only on this pre-booking surface — the exact
            // address and maps link appear on the booking view only.
            meetingPoint: publicMeetingPoint(
                this.safeMeetingPoint((result as any).meetingPoint),
                result.startLocation,
            ),
            // #447: re-derive media from stored references at read time.
            images: derivePublicMediaUrls((result as any).images),
            // #417 (Council P0-11): the resolved cancellation scale
            // (agency bands, or the platform defaults when the trip has
            // none) plus the platform floor terms — this is the scale
            // displayed in MAD before payment and snapshotted onto the
            // booking at creation. The raw stored policy stays in
            // `cancellationPolicy` for the agency editor.
            cancellationScale: buildCancellationScaleSnapshot(result.cancellationPolicy),
            agency: {
                ...publicAgency,
                // #447: logo re-derived at read time like trip images.
                logo: derivePublicMediaUrl((result.agency as any).logo) ?? null,
                // #569: umbrella reconciled with licence + insurance.
                verificationStatus: effectiveVerificationStatus(result.agency),
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
                // #428: stamp the tenant on the row (composite-FK chain).
                agencyId,
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
            select: { id: true, currency: true },
        });
        if (!template) throw new NotFoundException('Trip template not found');
        // B24(f) / #498: sessions of a non-MAD trip stay hidden while
        // the beta gate is on (indistinguishable from an absent trip).
        if (!isCatalogCurrencyAllowed(template.currency)) {
            throw new NotFoundException('Trip template not found');
        }

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

        const { itinerary, status: requestedStatus, imageAlts, cancellationPolicy, translations, destinationSlug, meetingPoint, ...tripData } = dto;

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

        // #546: the language map after this write. A supplied map is
        // merged over the stored one per language (the editor sends the
        // full map, but a partial PATCH must not erase other
        // languages); the French entry then mirrors the post-write
        // canonical columns. Omitting the map leaves it untouched
        // unless the French columns themselves change.
        const nextTitle = dto.title ?? existing.title;
        const nextDescription = dto.description ?? existing.description;
        // #584: canonical sections for the map's French mirror — the
        // post-write lists (dto wins, else the stored columns). The
        // itinerary rows only mirror when this write carries them.
        const frenchSections: TripCanonicalSections = {
            itinerary,
            inclusions: dto.inclusions ?? existing.inclusions,
            exclusions: dto.exclusions ?? existing.exclusions,
            checklist: dto.checklist ?? existing.checklist,
        };
        const mergedTranslations = translations
            ? buildTripTranslations(
                { ...normalizeTripTranslations(existing.translations), ...normalizeTripTranslations(translations) },
                { title: nextTitle, description: nextDescription, ...frenchSections },
            )
            : undefined;
        const effectiveTranslations = mergedTranslations
            ?? (dto.title !== undefined || dto.description !== undefined
                ? buildTripTranslations(existing.translations, { title: nextTitle, description: nextDescription, ...frenchSections })
                : undefined);

        // Batch B (#675/#676): post-write destination + meeting point.
        // The slug resolves when supplied or when startLocation moves;
        // the meeting point normalizes when supplied (null clears it).
        const resolvedDestinationSlug =
            destinationSlug !== undefined || dto.startLocation !== undefined
                ? this.resolveDestinationSlug(destinationSlug, dto.startLocation ?? existing.startLocation)
                : undefined;
        const effectiveMeetingPoint: MeetingPoint | null | undefined =
            meetingPoint !== undefined
                ? normalizeMeetingPoint(meetingPoint)
                : undefined;
        // #417: normalize the supplied bands once — the publish gate
        // below and the stored value share the exact same scale.
        const normalizedCancellationPolicy = cancellationPolicy
            ? normalizeCancellationPolicyInput(cancellationPolicy)
            : undefined;
        const effectiveCancellationPolicy =
            normalizedCancellationPolicy ?? (existing as { cancellationPolicy?: unknown }).cancellationPolicy;

        const isPublishTransition =
            status === TripStatus.ACTIVE && existing.status !== TripStatus.ACTIVE;
        // Itinerary rows the gates/warnings evaluate: the replacement
        // carried by this PATCH, else the stored days.
        const gateItinerary =
            status === TripStatus.ACTIVE
                ? (itinerary ?? await this.db.itineraryDay.findMany({
                    where: { templateId: id },
                    orderBy: { dayNumber: 'asc' },
                }))
                : undefined;
        const postWriteTexts = {
            title: nextTitle,
            description: nextDescription,
            translations: effectiveTranslations ?? existing.translations,
            itinerary: gateItinerary,
            inclusions: dto.inclusions ?? existing.inclusions,
            exclusions: dto.exclusions ?? existing.exclusions,
            checklist: dto.checklist ?? existing.checklist,
        };

        // #371: a status change INTO Active is a publish transition and
        // goes through the same identity + licence gate as activate.
        if (isPublishTransition) {
            await this.assertAgencyCanPublish(agencyId);
            // #546: ... and the French content gate, evaluated on the
            // post-write content (this PATCH may itself supply French).
            // #584: sections gate on the post-write canonical sections
            // (itinerary rows are fetched when the PATCH doesn't carry
            // a replacement itinerary).
            this.assertFrenchPublishable(postWriteTexts);
            // Council S6 Batch B: commercial-terms + meeting gates,
            // also on the post-write state (this PATCH may itself
            // supply the scale / meeting point that satisfies them).
            this.assertBatchBPublishable({
                cancellationPolicy: effectiveCancellationPolicy,
                meetingPoint: effectiveMeetingPoint ?? (existing as { meetingPoint?: unknown }).meetingPoint,
                ...postWriteTexts,
            });
        } else if (status === TripStatus.ACTIVE && existing.status === TripStatus.ACTIVE) {
            // #674: a published trip may not be edited INTO carrying
            // free-text cancellation/payment terms either — scan any
            // text this PATCH touches (the scale/meeting gates do not
            // re-run for already-published trips, per the #371 rule).
            const touchesText =
                dto.title !== undefined || dto.description !== undefined || translations !== undefined
                || dto.inclusions !== undefined || dto.exclusions !== undefined
                || dto.checklist !== undefined || itinerary !== undefined;
            if (touchesText) {
                const prohibited = findProhibitedCommercialTerms(collectTripTexts(postWriteTexts));
                if (prohibited.length > 0) {
                    throw new BadRequestException(
                        `Free-text cancellation/payment terms are not allowed on a published trip (${prohibited.join(', ')}) — the structured cancellation scale is the only cancellation text a trip may carry`,
                    );
                }
            }
        }

        const updated = await this.db.tripTemplate.update({
            where: { id },
            data: {
                ...tripData,
                // #675 + #676: resolved destination stamp + normalized
                // meeting point (undefined = untouched on this PATCH;
                // an explicit clear stores JSON null, per the codebase's
                // JsonNull convention for nullable Json columns).
                destinationSlug: resolvedDestinationSlug,
                meetingPoint: effectiveMeetingPoint === undefined
                    ? undefined
                    : effectiveMeetingPoint === null
                        ? Prisma.JsonNull
                        : (effectiveMeetingPoint as unknown as Prisma.InputJsonValue),
                // #417: same validated normalization as create; omitting
                // the field leaves the stored bands untouched.
                cancellationPolicy: normalizedCancellationPolicy
                    ? (normalizedCancellationPolicy as unknown as Prisma.InputJsonValue)
                    : undefined,
                translations: effectiveTranslations
                    ? (effectiveTranslations as unknown as Prisma.InputJsonValue)
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
        // #676: a publish transition reports the non-blocking
        // completeness warnings alongside the trip (never persisted,
        // never traveller-facing).
        if (isPublishTransition) {
            return { ...updated, publishWarnings: this.publishWarningsFor(gateItinerary) };
        }
        return updated;
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
        // #546: re-activation is a publish transition — French gate too.
        // #584: the gate also covers sections; the stored record does
        // not carry the itinerary relation, so fetch the days.
        const days = await this.db.itineraryDay.findMany({ where: { templateId: id } });
        this.assertFrenchPublishable({ ...existing, itinerary: days });
        // Council S6 Batch B: commercial-terms + meeting gates too.
        this.assertBatchBPublishable({ ...existing, itinerary: days });
        const updated = await this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.ACTIVE },
        });
        return { ...updated, publishWarnings: this.publishWarningsFor(days) };
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
        // #546: restore lands in ACTIVE — French gate too.
        // #584: sections included, days fetched as in activateTemplate.
        const days = await this.db.itineraryDay.findMany({ where: { templateId: id } });
        this.assertFrenchPublishable({ ...existing, itinerary: days });
        // Council S6 Batch B: commercial-terms + meeting gates too.
        this.assertBatchBPublishable({ ...existing, itinerary: days });
        const updated = await this.db.tripTemplate.update({
            where: { id },
            data: { status: TripStatus.ACTIVE },
        });
        return { ...updated, publishWarnings: this.publishWarningsFor(days) };
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
