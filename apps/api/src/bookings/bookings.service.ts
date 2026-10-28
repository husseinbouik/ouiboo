import { Injectable, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CURRENT_BOOKING_TERMS_VERSION, UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, PaymentMethodEnum } from './dto/create-booking.dto';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import { BookingPaymentPlanStatus, BookingPaymentStatus, ExternalPaymentStage, PaymentCustodian, PaymentLedgerSource, PaymentMethod, SessionGroupStatus } from '@ouiboo/database';
import { BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT, mapBookingDetails } from './booking-response.util';
import { resolvePaymentProofDownloadUrl } from './payment-proof-url.util';
import { Prisma } from '@ouiboo/database';
import { decimalEqualsMoney, multiplyMoney, toMoneyDecimal, toMoneyString } from '../common/money.util';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';
import { isInsuranceVerified, isLicenceVerified } from '../common/agency-licence.util';
import { isCatalogCurrencyAllowed } from '../common/catalog-currency.util';
import {
    buildCancellationScaleSnapshot,
} from '../cancellation/cancellation.util';

const DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS = 24;

// The include shape create() builds its response from, shared with the
// #494 idempotency replay lookup so a replayed response is built from
// exactly the same data as the original one.
const BOOKING_RESPONSE_INCLUDE = {
    session: {
        include: {
            template: {
                include: {
                    agency: true,
                },
            },
        },
    },
    traveler: {
        select: {
            email: true,
            name: true,
        },
    },
    paymentProof: true,
    paymentPlan: true,
    review: {
        select: {
            id: true,
        },
    },
} satisfies Prisma.BookingInclude;

// #494 (Council Session #2, B16): canonical payload hash for a booking
// idempotency key — covers only the fields that define WHAT was booked;
// a replay changing any of them under the same key is answered 409.
export function bookingIdempotencyPayloadHash(dto: CreateBookingDto): string {
    const canonical = JSON.stringify({
        sessionId: dto.sessionId ?? null,
        guestsCount: dto.guestsCount ?? null,
        fullName: dto.fullName ?? null,
        phoneNumber: dto.phoneNumber ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        termsVersion: dto.termsVersion ?? null,
        locale: dto.locale ?? null,
    });
    return createHash('sha256').update(canonical).digest('hex');
}

// Normalize an Idempotency-Key header: absent/blank opts out (legacy
// behaviour); over-long keys are rejected, never truncated.
function normalizeIdempotencyKey(rawKey?: string | null): string | null {
    const key = rawKey?.trim();
    if (!key) {
        return null;
    }
    if (key.length > 200) {
        throw new BadRequestException('Idempotency-Key is too long');
    }
    return key;
}

// #494: the API shape of a DuplicateCreditFlag (money as string,
// dates as ISO strings), shared by the agency and admin surfaces.
export function serializeDuplicateCreditFlag(flag: {
    id: string;
    bookingId: string;
    externalPaymentId: string | null;
    agencyId: string;
    reportedBy: string;
    amount: unknown;
    currency: string;
    bankReference: string | null;
    note: string | null;
    status: string;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    resolutionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: flag.id,
        bookingId: flag.bookingId,
        externalPaymentId: flag.externalPaymentId,
        agencyId: flag.agencyId,
        reportedBy: flag.reportedBy,
        amount: toMoneyString(flag.amount as never),
        currency: flag.currency,
        bankReference: flag.bankReference,
        note: flag.note,
        status: flag.status,
        resolvedBy: flag.resolvedBy,
        resolvedAt: flag.resolvedAt ? flag.resolvedAt.toISOString() : null,
        resolutionNote: flag.resolutionNote,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
    };
}

function isIdempotencyUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const candidate = error as { code?: unknown; meta?: { target?: unknown } };
    if (candidate.code !== 'P2002') {
        return false;
    }
    return JSON.stringify(candidate.meta?.target ?? '').includes('idempotencyKey');
}

@Injectable()
export class BookingsService {
    constructor(
        private db: DatabaseService,
        private emailService: EmailService,
        private uploadService: UploadService,
        private externalPaymentsService: ExternalPaymentsService,
        private stagedPaymentsService: StagedPaymentsService,
    ) { }

    async create(travelerId: string, dto: CreateBookingDto, rawIdempotencyKey?: string) {
        // #494 (Council Session #2, B16): idempotent creation — one
        // client UUID per booking ATTEMPT, sent as Idempotency-Key.
        // The lookup runs before all other validation on purpose: a
        // replay returns the original booking even if the session has
        // since closed (the operation already happened); the same key
        // with a DIFFERENT payload is a client bug, answered 409.
        const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
        const idempotencyPayloadHash = idempotencyKey
            ? bookingIdempotencyPayloadHash(dto)
            : null;
        if (idempotencyKey) {
            const replayed = await this.findBookingByIdempotencyKey(travelerId, idempotencyKey);
            if (replayed) {
                if (replayed.idempotencyPayloadHash !== idempotencyPayloadHash) {
                    throw new ConflictException('Idempotency-Key was already used with a different booking payload');
                }
                return mapBookingDetails(replayed);
            }
        }

        if (!dto?.sessionId || typeof dto.sessionId !== 'string') {
            throw new BadRequestException('sessionId is required');
        }

        if (!Number.isInteger(dto.guestsCount) || dto.guestsCount <= 0) {
            throw new BadRequestException('guestsCount must be a positive integer');
        }

        for (const [field, value] of Object.entries({ fullName: dto.fullName, phoneNumber: dto.phoneNumber })) {
            if (typeof value !== 'string' || value.trim().length === 0) {
                throw new BadRequestException(field + ' is required');
            }
        }

        // B9 (Council Session #2, #481): terms acceptance is a hard gate
        // for NEW bookings — this deliberately reverses #481's "never
        // block a booking" clause. The DTO pipe already rejects a
        // missing termsAccepted / termsVersion / locale and any version
        // outside the allowlist; these checks repeat the rule at the
        // service boundary so no caller can create a booking without a
        // complete acceptance record (explicit acceptance + allowlisted
        // version + locale; the server stamps the timestamp below).
        if (dto.termsAccepted !== true) {
            throw new BadRequestException('The booking terms must be accepted to complete a booking');
        }
        if (dto.termsVersion !== CURRENT_BOOKING_TERMS_VERSION) {
            throw new BadRequestException('Unknown booking terms version');
        }
        if (!dto.locale || !['en', 'fr', 'ar'].includes(dto.locale)) {
            throw new BadRequestException('locale is required');
        }

        const session = await this.db.tripSession.findUnique({
            where: { id: dto.sessionId },
            include: { template: { include: { agency: true } } }
        });

        if (!session) {
            throw new BadRequestException('Session not found');
        }

        const now = new Date();
        const agency = session.template.agency;
        const subscriptionValid = agency.subscriptionStatus === 'ACTIVE'
            ? !agency.subscriptionEndsAt || agency.subscriptionEndsAt > now
            : agency.subscriptionStatus === 'TRIAL'
                && !!agency.trialEndsAt
                && agency.trialEndsAt > now;

        if (session.template.status !== 'ACTIVE'
            || session.status !== 'OPEN'
            || session.startDate <= now) {
            throw new BadRequestException('This trip session is not available for booking');
        }
        if (agency.verificationStatus !== 'VERIFIED' || !subscriptionValid) {
            throw new BadRequestException('This agency is not currently accepting bookings');
        }
        // #370: refund enforcement ladder (plan §16, level 2) — an agency
        // with an overdue refund is restricted from NEW bookings until the
        // refund is resolved. Existing bookings are never affected.
        if (agency.newBookingsRestrictedAt) {
            throw new BadRequestException('This agency is temporarily unable to accept new bookings');
        }
        // #415 (Council P0-08): a booking is a paid commitment — the
        // agency's travel licence AND RC insurance must be effectively
        // verified at booking time. Status is derived on read, so an
        // expired (or never-verified) artefact blocks new bookings
        // immediately, without waiting for the expiry sweep. Traveller-
        // facing wording stays generic, like the identity check above.
        if (!isLicenceVerified(agency, now) || !isInsuranceVerified(agency, now)) {
            throw new BadRequestException('This agency is not currently accepting bookings');
        }
        // B24(f) / #498: beta catalogue admission — while the MAD-only
        // gate is on, a non-MAD trip cannot be booked even by a direct
        // API call (the public catalogue also hides it; this service
        // check is the enforcement point). Session and template
        // currencies are kept equal by the #498 invariant, so either
        // field carries the answer.
        if (!isCatalogCurrencyAllowed(session.currency ?? session.template.currency)) {
            throw new BadRequestException('This trip is not available for booking yet');
        }
        if (dto.paymentMethod === PaymentMethodEnum.WALLET) {
            throw new BadRequestException('This payment method is not available');
        }

        // #369 staged payments: minimum-group trips collect a deposit first.
        const staged = this.stagedPaymentsService.isStagedSession(session);
        if (staged) {
            if (session.groupStatus === SessionGroupStatus.NOT_CONFIRMED) {
                throw new BadRequestException('This trip was not confirmed because the minimum group size was not reached');
            }
            if (session.groupStatus !== SessionGroupStatus.CONFIRMED
                && session.confirmationDeadline
                && session.confirmationDeadline <= now) {
                throw new BadRequestException('The confirmation deadline for this trip has passed');
            }
            // Phase 1: staged trips are paid by manual bank transfer only.
            // A one-shot gateway payment would make an unconfirmed trip
            // fully payable, which the staged model forbids (plan §53).
            if (dto.paymentMethod && dto.paymentMethod !== PaymentMethodEnum.BANK_TRANSFER) {
                throw new BadRequestException('Only bank transfer payment is available for this trip until it is confirmed');
            }
        }

        const runCreateTransaction = () => this.db.$transaction(async (tx) => {

            // 2. Atomic update to reserve seats (Concurrent Safe)
            // returning count helps know if it succeeded
            const result = await tx.tripSession.updateMany({
                where: {
                    id: dto.sessionId,
                    status: 'OPEN',
                    startDate: { gt: now },
                    availableSeats: { gte: dto.guestsCount }
                },
                data: {
                    availableSeats: {
                        decrement: dto.guestsCount,
                    },
                },
            });

            if (result.count === 0) {
                throw new BadRequestException('Not enough seats available');
            }

            // Check only after acquiring the session row through the update above.
            // This prevents two concurrent requests from the same traveler booking twice.
            const existing = await tx.booking.findFirst({
                where: {
                    sessionId: dto.sessionId,
                    travelerId,
                    status: { not: 'CANCELLED' }
                }
            });

            if (existing) {
                throw new BadRequestException('You already have a booking for this session');
            }

            // Re-fetch session with template/agency info for email notifications
            const sessionWithInfo = await tx.tripSession.findUnique({
                where: { id: dto.sessionId },
                include: { template: { include: { agency: true } } }
            });
            if (!sessionWithInfo) {
                throw new BadRequestException('Session not found');
            }

            // Map PaymentMethodEnum to PaymentMethod enum
            const paymentMethodMap: Record<PaymentMethodEnum, PaymentMethod> = {
              [PaymentMethodEnum.BANK_TRANSFER]: PaymentMethod.MANUAL,
              [PaymentMethodEnum.CARD]: PaymentMethod.GATEWAY,
              [PaymentMethodEnum.WALLET]: PaymentMethod.MANUAL,
              [PaymentMethodEnum.MOBILE_MONEY]: PaymentMethod.GATEWAY,
            };
            const persistedPaymentMethod = dto.paymentMethod
              ? paymentMethodMap[dto.paymentMethod]
              : PaymentMethod.MANUAL;

            const totalAmount = multiplyMoney(sessionWithInfo.price, dto.guestsCount);

            // #417 (Council P0-11): snapshot the trip's resolved
            // cancellation scale onto the booking, so later template
            // edits can never rewrite the terms booked under. The same
            // snapshot's lines go into the booking confirmation email.
            const cancellationScale = buildCancellationScaleSnapshot(
                sessionWithInfo.template.cancellationPolicy,
            );

            const booking = await tx.booking.create({
                data: {
                    sessionId: dto.sessionId,
                    // #428: stamp the tenant from the session's template —
                    // the composite FK to TripSession(id, agencyId) makes a
                    // mismatched pairing unrepresentable.
                    agencyId: sessionWithInfo.template.agencyId,
                    travelerId,
                    guestsCount: dto.guestsCount,
                    totalAmount,
                    cancellationScale: cancellationScale as unknown as Prisma.InputJsonValue,
                    currency: sessionWithInfo.currency || 'MAD',
                    status: 'PENDING',
                    fullName: dto.fullName,
                    phoneNumber: dto.phoneNumber,
                    // #424 + B9: persist the checkout locale so
                    // booking-journey emails render in the traveller's
                    // language; it is also part of the terms-acceptance
                    // record. Required by the B9 gate above.
                    locale: dto.locale,
                    // #481 + B9: persist the accepted booking-terms
                    // version with a server acceptance timestamp, so the
                    // booking proves which terms it was made under. The
                    // B9 gate guarantees both are always recorded for
                    // new bookings (NULL survives only on pre-B9 rows).
                    termsVersion: dto.termsVersion,
                    termsAcceptedAt: new Date(),
                    // #494: persisted so a replayed request finds this
                    // booking by (travelerId, key); null when the
                    // caller sent no key.
                    idempotencyKey,
                    idempotencyPayloadHash,
                    paymentMethod: persistedPaymentMethod,
                },
                include: {
                    session: {
                        include: {
                            template: {
                                include: {
                                    agency: true,
                                },
                            },
                        },
                    },
                    traveler: {
                        select: {
                            email: true,
                            name: true,
                        },
                    },
                    paymentProof: true,
                    paymentPlan: true,
                    review: {
                        select: {
                            id: true,
                        },
                    },
                },
            });

            // #369: snapshot the staged payment plan (deposit/balance split,
            // minimum, deadline) for minimum-group sessions.
            if (staged) {
                const plan = await this.stagedPaymentsService.createPlanInTransaction(tx, {
                    bookingId: booking.id,
                    agencyId: session.template.agencyId,
                    guestsCount: dto.guestsCount,
                    totalAmount,
                    session,
                });
                booking.paymentPlan = plan as typeof booking.paymentPlan;
            }

            const traveler = await tx.user.findUnique({ where: { id: travelerId } });
            const agencyUser = await tx.user.findUnique({ where: { id: sessionWithInfo.template.agency.userId } });

            return {
                booking: mapBookingDetails(booking),
                notification: traveler && agencyUser
                    ? {
                        travelerEmail: traveler.email,
                        agencyEmail: agencyUser.email,
                        bookingId: booking.id,
                        tripTitle: sessionWithInfo.template.title,
                        locale: booking.locale,
                        cancellationScale,
                        // B4: Law 31-08 seller identity block for the
                        // traveller's durable confirmation email. The
                        // licence flag uses the same effective-status
                        // derivation as the booking gate above.
                        seller: {
                            legalName: agency.legalName,
                            companyName: agency.companyName,
                            travelLicenceType: agency.travelLicenceType,
                            travelLicenceNumber: agency.travelLicenceNumber,
                            licenceVerified: isLicenceVerified(agency, now),
                            licenceIssuedAt: agency.licenceIssuedAt,
                            licenceIssuingAuthority: agency.licenceIssuingAuthority,
                        },
                    }
                    : null,
            };
        });

        let transactionResult: Awaited<ReturnType<typeof runCreateTransaction>>;
        try {
            transactionResult = await runCreateTransaction();
        } catch (error) {
            // #494: concurrent first-time requests with the same key
            // both pass the pre-check; the loser hits the unique index
            // inside its transaction and rolls back cleanly (no seats
            // lost). Answer with the winner's booking — or 409 when
            // the winner carried a different payload.
            if (!idempotencyKey || !isIdempotencyUniqueViolation(error)) {
                throw error;
            }
            const winner = await this.findBookingByIdempotencyKey(travelerId, idempotencyKey);
            if (!winner) {
                throw error;
            }
            if (winner.idempotencyPayloadHash !== idempotencyPayloadHash) {
                throw new ConflictException('Idempotency-Key was already used with a different booking payload');
            }
            return mapBookingDetails(winner);
        }

        if (transactionResult.notification) {
            const notification = transactionResult.notification;
            // #436 (Council P1-10): await the booking emails — the same
            // serverless-freeze failure class as #409. An un-awaited send
            // races the instance freeze after the response returns and the
            // mail is lost. The send is awaited but never allowed to fail
            // the booking: the booking is already committed, so a delivery
            // error is logged, not thrown (the #410 auth pattern).
            try {
                await this.emailService.sendBookingNotification(
                    notification.travelerEmail,
                    notification.agencyEmail,
                    notification.bookingId,
                    notification.tripTitle,
                    notification.locale,
                    notification.cancellationScale,
                    notification.seller,
                );
            } catch (error) {
                console.error('Failed to send booking notification email', error);
            }
        }

        return transactionResult.booking;
    }

    // #494: the stored booking for a traveller's idempotency key, with
    // the response include — null when the key was never used.
    private async findBookingByIdempotencyKey(travelerId: string, idempotencyKey: string) {
        return this.db.booking.findFirst({
            where: { travelerId, idempotencyKey },
            include: BOOKING_RESPONSE_INCLUDE,
        });
    }

    async findAllByTraveler(travelerId: string, page = 1, limit = 10) {
        const safeLimit = Number.isFinite(limit)
            ? Math.min(50, Math.max(1, Math.floor(limit)))
            : 10;
        const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
        const where = { travelerId };
        const [bookings, total] = await Promise.all([
            this.db.booking.findMany({
                where,
                include: {
                    session: {
                        include: {
                            template: {
                                include: {
                                    agency: true,
                                },
                            },
                        },
                    },
                    paymentProof: true,
                    paymentPlan: true,
                    // #422: lets mapBookingDetails embed the proof's
                    // bank-confirmation state (see booking-response.util).
                    externalPayments: { select: BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT },
                    review: {
                        select: {
                            id: true,
                        },
                    },
                    traveler: {
                        select: {
                            email: true,
                            name: true,
                        },
                    },
                },
                orderBy: { bookingDate: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.booking.count({ where }),
        ]);

        return {
            data: bookings.map((booking) => mapBookingDetails(booking)),
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            },
        };
    }

    async findOneForUser(bookingId: string, userId: string, role?: string, locale?: string | null) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentProof: true,
                paymentPlan: true,
                // #422: see findAllByTraveler — bank-confirmation embedding.
                externalPayments: { select: BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT },
                session: {
                    include: {
                        template: {
                            include: {
                                agency: true,
                            },
                        },
                    },
                },
                traveler: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
                review: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        const agency = await this.db.agencyProfile.findUnique({ where: { userId } });
        const isTraveler = booking.travelerId === userId;
        const isAgencyOwner = agency && booking.session.template.agencyId === agency.id;
        const isAdmin = role === UserRole.Admin;

        if (!isTraveler && !isAgencyOwner && !isAdmin) {
            throw new ForbiddenException('Forbidden');
        }

        return mapBookingDetails(booking, locale);
    }

    async uploadPaymentProof(bookingId: string, userId: string, file: Express.Multer.File, rawIdempotencyKey?: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentPlan: true,
                paymentProof: true,
            },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (booking.travelerId !== userId) {
            throw new ForbiddenException('Forbidden');
        }

        // #494 (B16): idempotent proof submission — a replayed key
        // with the SAME file returns the stored proof untouched (no
        // re-upload, no status reset, no second pending record), even
        // if the booking has since moved on; the same key with a
        // DIFFERENT file is a 409. A genuinely new proof (new key,
        // e.g. after a rejection) replaces the stored one below.
        const proofIdempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
        const proofPayloadHash = proofIdempotencyKey && file?.buffer
            ? createHash('sha256').update(file.buffer).digest('hex')
            : null;
        if (proofIdempotencyKey && booking.paymentProof?.idempotencyKey === proofIdempotencyKey) {
            if (booking.paymentProof.idempotencyPayloadHash !== proofPayloadHash) {
                throw new ConflictException('Idempotency-Key was already used with a different payment proof');
            }
            return {
                ...booking.paymentProof,
                downloadUrl: this.buildPaymentProofDownloadUrl(bookingId),
            };
        }

        // #369 staged payments: the plan decides which payment step a proof
        // belongs to. A balance proof before confirmation is rejected here
        // (invariant), as is any proof once the deposit is refund-due.
        const plan = booking.paymentPlan;
        let isInitialStage = true;
        if (plan) {
            if (plan.status === BookingPaymentPlanStatus.BALANCE_DUE) {
                isInitialStage = false;
                if (!['CONFIRMED', 'REJECTED', 'AWAITING_VALIDATION'].includes(booking.status)) {
                    throw new BadRequestException('Booking is not awaiting a balance payment proof');
                }
            } else if (plan.status === BookingPaymentPlanStatus.DEPOSIT_DUE) {
                if (booking.session.groupStatus === SessionGroupStatus.NOT_CONFIRMED) {
                    throw new BadRequestException('This trip was not confirmed because the minimum group size was not reached');
                }
                if (!['PENDING', 'REJECTED', 'AWAITING_VALIDATION'].includes(booking.status)) {
                    throw new BadRequestException('Booking is not awaiting a deposit payment proof');
                }
            } else {
                throw new BadRequestException('This booking is not awaiting a payment proof');
            }
        }

        const allowedStatuses = new Set(['PENDING', 'REJECTED', 'AWAITING_VALIDATION']);
        if (isInitialStage && !allowedStatuses.has(booking.status)) {
            throw new BadRequestException('Booking cannot accept payment proof');
        }

        // The submission window applies to the initial payment step only;
        // the balance step opens at confirmation (plan §26).
        if (isInitialStage && booking.status !== 'AWAITING_VALIDATION' && this.isPaymentProofExpired(booking.bookingDate)) {
            await this.db.$transaction(async (tx) => {
                await tx.tripSession.update({
                    where: { id: booking.sessionId },
                    data: {
                        availableSeats: {
                            increment: booking.guestsCount,
                        },
                    },
                });
                await tx.booking.update({
                    where: { id: bookingId },
                    data: { status: 'CANCELLED' },
                });
            });
            throw new BadRequestException('Booking has expired. Please create a new booking.');
        }

        const uploadResult = await this.uploadService.uploadFile(file, `private/payment-proofs/${bookingId}`);
        const downloadUrl = this.buildPaymentProofDownloadUrl(bookingId);

        return this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.upsert({
                where: { bookingId },
                update: {
                    imageUrl: uploadResult.filename,
                    uploadedAt: new Date(),
                    status: 'PENDING',
                    rejectionReason: null,
                    // #494: the stored key always tracks the latest
                    // accepted submission (null when it sent none).
                    idempotencyKey: proofIdempotencyKey,
                    idempotencyPayloadHash: proofPayloadHash,
                },
                create: {
                    bookingId,
                    imageUrl: uploadResult.filename,
                    status: 'PENDING',
                    idempotencyKey: proofIdempotencyKey,
                    idempotencyPayloadHash: proofPayloadHash,
                },
            });

            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'AWAITING_VALIDATION',
                    paymentProofUrl: downloadUrl,
                    paymentProofId: proof.id,
                },
            });

            // #422 (Council P0-20): the stage's ExternalPayment exists from
            // upload in PENDING_VERIFICATION with the EXPECTED stage amount,
            // so "proof received — pending bank confirmation" is a real
            // record on every surface. Upload settles nothing: the booking
            // stays UNPAID until the agency confirms the bank credit.
            const stage = plan
                ? (isInitialStage ? ExternalPaymentStage.DEPOSIT : ExternalPaymentStage.BALANCE)
                : ExternalPaymentStage.FULL;
            const expectedAmount = plan
                ? (isInitialStage ? plan.depositAmount : plan.balanceAmount)
                : booking.totalAmount;
            await this.externalPaymentsService.recordPaymentPendingInTransaction(tx, {
                bookingId,
                agencyId: booking.session.template.agencyId,
                travelerId: booking.travelerId,
                amount: expectedAmount,
                currency: booking.currency,
                method: booking.paymentMethod ?? PaymentMethod.MANUAL,
                externalReference: proof.id,
                custodian: PaymentCustodian.AGENCY,
                source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
                stage,
            });

            return {
                ...proof,
                downloadUrl,
            };
        });
    }

    // #494 (Council Session #2, B16): duplicate-credit flag. A
    // traveller who transfers twice creates two real bank credits,
    // but bank confirmation binds exactly one — the second is
    // invisible to the ledger. The agency reports what it observed
    // (amount + reference) here for admin reconciliation. Ops record
    // only: a flag never moves money or mutates the ledger.
    async createDuplicateCreditFlag(
        bookingId: string,
        tenantAgencyId: string,
        reportedByUserId: string,
        input: { amount: unknown; bankReference?: string | null; note?: string | null },
    ) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                currency: true,
                session: { select: { template: { select: { agencyId: true } } } },
            },
        });
        if (!booking) {
            throw new BadRequestException('Booking not found');
        }
        if (booking.session.template.agencyId !== tenantAgencyId) {
            throw new ForbiddenException('You can only flag duplicate credits on your own bookings');
        }

        let amount: ReturnType<typeof toMoneyDecimal>;
        try {
            amount = toMoneyDecimal(input.amount as never);
        } catch {
            throw new BadRequestException('amount must be a valid money amount');
        }
        if (!amount.gt(0)) {
            throw new BadRequestException('amount must be greater than zero');
        }

        // Link the flag to the booking's recorded payment when one
        // exists, so admin reconciliation starts from the credit that
        // WAS recorded.
        const recordedPayment = await this.db.externalPayment.findFirst({
            where: { bookingId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        const flag = await this.db.duplicateCreditFlag.create({
            data: {
                bookingId,
                externalPaymentId: recordedPayment?.id ?? null,
                agencyId: tenantAgencyId,
                reportedBy: reportedByUserId,
                amount,
                currency: booking.currency || 'MAD',
                bankReference: input.bankReference?.trim() || null,
                note: input.note?.trim() || null,
            },
        });
        return serializeDuplicateCreditFlag(flag);
    }

    async listDuplicateCreditFlagsForAgency(agencyId: string) {
        const flags = await this.db.duplicateCreditFlag.findMany({
            where: { agencyId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return flags.map(serializeDuplicateCreditFlag);
    }

    async getPaymentProofFile(bookingId: string, userId: string, role?: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentProof: true,
                paymentPlan: true,
                session: { include: { template: true } },
            },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        const agency = await this.db.agencyProfile.findUnique({ where: { userId } });
        const isTraveler = booking.travelerId === userId;
        const isAgencyOwner = agency && booking.session.template.agencyId === agency.id;
        const isAdmin = role === UserRole.Admin;

        if (!isTraveler && !isAgencyOwner && !isAdmin) {
            throw new BadRequestException('Unauthorized: Booking does not belong to you');
        }

        if (!booking.paymentProof) {
            throw new BadRequestException('No payment proof uploaded');
        }

        const paymentProofId = booking.paymentProofId;
        if (!paymentProofId) {
            throw new BadRequestException('No payment proof uploaded');
        }

        // #390: never resolve a filesystem path for the controller to hand to
        // res.sendFile. Both storage backends serve the proof as bytes through
        // UploadService.readFile, which resolves the stored (server-generated)
        // key through the provider's canonicalized, containment-checked path
        // handling.
        const { data, contentType } = await this.uploadService.readFile(booking.paymentProof.imageUrl);
        return { buffer: data, contentType };
    }

    isLocal() {
        return this.uploadService.isLocal();
    }


    private buildPaymentProofDownloadUrl(bookingId: string) {
        return resolvePaymentProofDownloadUrl(bookingId, process.env.API_URL);
    }

    private isPaymentProofExpired(bookingDate: Date) {
        const hours = Number(process.env.PAYMENT_PROOF_EXPIRATION_HOURS);
        const normalizedHours = Number.isFinite(hours) && hours > 0
            ? hours
            : DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS;
        const expiresAt = new Date(bookingDate.getTime() + normalizedHours * 60 * 60 * 1000);
        return new Date() > expiresAt;
    }

    /**
     * Shared loading + ownership gate for the manual payment review flow
     * (#422 steps: proof review in verifyPayment, bank confirmation in
     * confirmBankPayment). Fails closed on unknown bookings, other
     * agencies' bookings, and bookings without an uploaded proof.
     */
    private async loadPaymentReviewContext(bookingId: string, tenantId: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentProof: true,
                paymentPlan: true,
                traveler: { select: { email: true } },
            }
        });

        if (!booking) throw new BadRequestException('Booking not found');

        const agency = await this.db.agencyProfile.findUnique({
            where: { id: tenantId }
        });
        if (!agency || booking.session.template.agencyId !== agency.id) {
            throw new ForbiddenException('Forbidden');
        }

        if (!booking.paymentProof) {
            throw new BadRequestException('No payment proof uploaded');
        }
        const paymentProof = booking.paymentProof;

        const paymentProofId = booking.paymentProofId;
        if (!paymentProofId) {
            throw new BadRequestException('No payment proof uploaded');
        }

        return { booking, paymentProof, paymentProofId };
    }

    async verifyPayment(bookingId: string, tenantId: string, approved: boolean, rejectionReason?: string) {
        if (typeof approved !== 'boolean') {
            throw new BadRequestException('approved must be a boolean');
        }

        // 1. Get Booking and verify Agency ownership
        const { booking, paymentProof, paymentProofId } = await this.loadPaymentReviewContext(bookingId, tenantId);

        if (paymentProof.status !== 'PENDING') {
            throw new BadRequestException('Payment proof has already been reviewed');
        }

        if (booking.status !== 'AWAITING_VALIDATION') {
            throw new BadRequestException('Booking is not awaiting payment validation');
        }

        if (!approved && !rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting a payment');
        }

        const updatedBooking = await this.db.$transaction(async (tx) => {
            // #422 (Council P0-20): proof review is no longer settlement.
            // Approving the image only ACCEPTS the proof; the booking, the
            // plan and the ExternalPayment stay exactly where upload left
            // them until the agency confirms the credit in its bank account
            // (see confirmBankPayment). Rejection stays one-step.
            const claimedProof = await tx.paymentProof.updateMany({
                where: { id: paymentProofId, status: 'PENDING' },
                data: {
                    status: approved ? 'ACCEPTED' : 'REJECTED',
                    rejectionReason: approved ? null : rejectionReason,
                }
            });
            if (claimedProof.count !== 1) {
                throw new BadRequestException('Payment proof has already been reviewed');
            }

            if (approved) {
                const updated = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
                return { booking: updated, fullyPaid: false };
            }

            // #369: staged bookings follow the plan state machine on
            // rejection (deposit stage fails the booking; balance stage
            // keeps the confirmed booking with the deposit paid).
            if (booking.paymentPlan) {
                await this.stagedPaymentsService.applyProofRejectionInTransaction(tx, {
                    booking,
                    plan: booking.paymentPlan,
                    source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
                    externalReference: paymentProofId,
                });
                const updated = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
                return { booking: updated, fullyPaid: false };
            }

            // #368: rejecting a payment proof records the fact only. It
            // must never credit a withdrawable OuiBoo balance.
            await this.externalPaymentsService.recordPaymentRejectedInTransaction(tx, {
                bookingId,
                agencyId: booking.session.template.agencyId,
                travelerId: booking.travelerId,
                amount: booking.totalAmount,
                currency: booking.currency,
                method: PaymentMethod.MANUAL,
                externalReference: paymentProofId,
                custodian: PaymentCustodian.AGENCY,
                source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
            });

            const claimedBooking = await tx.booking.updateMany({
                where: { id: bookingId, status: 'AWAITING_VALIDATION' },
                data: {
                    status: 'REJECTED',
                    paymentStatus: BookingPaymentStatus.FAILED,
                    confirmedAt: null,
                }
            });
            if (claimedBooking.count !== 1) {
                throw new BadRequestException('Booking is not awaiting payment validation');
            }

            const updated = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
            return { booking: updated, fullyPaid: false };
        });

        return updatedBooking.booking;
    }

    /**
     * #422 (Council P0-20): bank confirmation — the ONLY step that settles
     * a manual payment. The agency confirms the credit it actually
     * observed in its own bank account (amount + bank transfer reference);
     * only then do the effects proof approval used to perform happen:
     * ExternalPayment VERIFIED bound to confirmedAmount/bankReference,
     * booking PAID/PARTIALLY_PAID, plan DEPOSIT_PAID/FULLY_PAID, and the
     * "payment confirmed" email when fully paid.
     *
     * Guards: the proof must be ACCEPTED first, a bank reference is
     * required, and confirmedAmount must equal the expected stage amount
     * (a short credit blocks confirmation — the agency rejects the proof
     * or asks for a top-up instead; founder decision D1, beta behaviour).
     */
    async confirmBankPayment(
        bookingId: string,
        tenantId: string,
        confirmedByUserId: string,
        dto: { confirmedAmount?: unknown; bankReference?: unknown },
    ) {
        const bankReference = typeof dto?.bankReference === 'string' ? dto.bankReference.trim() : '';
        if (!bankReference) {
            throw new BadRequestException('A bank reference is required to confirm a bank payment');
        }
        if (dto?.confirmedAmount === undefined || dto?.confirmedAmount === null || dto?.confirmedAmount === '') {
            throw new BadRequestException('confirmedAmount is required to confirm a bank payment');
        }
        const confirmedAmount = toMoneyDecimal(dto.confirmedAmount as never, 'confirmedAmount');
        if (confirmedAmount.lessThanOrEqualTo(0)) {
            throw new BadRequestException('confirmedAmount must be a positive amount');
        }

        const { booking, paymentProof, paymentProofId } = await this.loadPaymentReviewContext(bookingId, tenantId);

        if (paymentProof.status !== 'ACCEPTED') {
            throw new BadRequestException('Payment proof must be accepted before bank confirmation');
        }

        if (booking.status !== 'AWAITING_VALIDATION') {
            throw new BadRequestException('Booking is not awaiting payment validation');
        }

        const plan = booking.paymentPlan;
        const expectedAmount = plan
            ? (plan.status === BookingPaymentPlanStatus.DEPOSIT_DUE
                ? plan.depositAmount
                : plan.status === BookingPaymentPlanStatus.BALANCE_DUE
                    ? plan.balanceAmount
                    : null)
            : booking.totalAmount;
        if (expectedAmount === null) {
            throw new BadRequestException('Booking is not awaiting a staged payment');
        }
        if (!decimalEqualsMoney(confirmedAmount, expectedAmount as never)) {
            throw new BadRequestException(
                'Confirmed amount does not match the expected payment amount; a short credit cannot be confirmed — reject the proof or ask the traveller for a top-up',
            );
        }

        const updatedBooking = await this.db.$transaction(async (tx) => {
            const claimedProof = await tx.paymentProof.updateMany({
                where: { id: paymentProofId, status: 'ACCEPTED' },
                data: {
                    status: 'VERIFIED',
                    rejectionReason: null,
                }
            });
            if (claimedProof.count !== 1) {
                throw new BadRequestException('Payment proof must be accepted before bank confirmation');
            }

            // #369: staged bookings follow the plan state machine (deposit
            // stage, then balance after confirmation); the recorded amount
            // is the confirmed bank credit, not the expected amount.
            if (plan) {
                const decision = await this.stagedPaymentsService.applyBankConfirmationInTransaction(tx, {
                    booking,
                    plan,
                    source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
                    externalReference: paymentProofId,
                    confirmedAmount,
                    bankReference,
                    bankConfirmedBy: confirmedByUserId,
                });
                const updated = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
                return { booking: updated, fullyPaid: decision.fullyPaid };
            }

            // #368: bank confirmation records the verified fact that the
            // traveller paid the AGENCY directly. It must never credit a
            // withdrawable OuiBoo balance.
            await this.externalPaymentsService.recordPaymentVerifiedInTransaction(tx, {
                bookingId,
                agencyId: booking.session.template.agencyId,
                travelerId: booking.travelerId,
                amount: confirmedAmount,
                currency: booking.currency,
                method: PaymentMethod.MANUAL,
                externalReference: paymentProofId,
                custodian: PaymentCustodian.AGENCY,
                source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
                bankReference,
                bankConfirmedBy: confirmedByUserId,
            });

            const claimedBooking = await tx.booking.updateMany({
                where: { id: bookingId, status: 'AWAITING_VALIDATION' },
                data: {
                    status: 'CONFIRMED',
                    paymentStatus: BookingPaymentStatus.PAID,
                    confirmedAt: new Date(),
                }
            });
            if (claimedBooking.count !== 1) {
                throw new BadRequestException('Booking is not awaiting payment validation');
            }

            const updated = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
            return { booking: updated, fullyPaid: true };
        });

        // The "payment confirmed" email means fully paid; a staged deposit
        // confirmation does not send it (the balance is still outstanding).
        if (updatedBooking.fullyPaid && booking.traveler?.email) {
            // #436 (Council P1-10): awaited like the booking notification
            // above — fire-and-forget loses this mail to the serverless
            // freeze (#409). A delivery failure is logged, never thrown:
            // the payment is already confirmed.
            try {
                await this.emailService.sendPaymentConfirmation(
                    booking.traveler.email,
                    booking.session.template.title,
                    booking.locale,
                );
            } catch (error) {
                console.error('Failed to send payment confirmation email', error);
            }
        }

        return updatedBooking.booking;
    }

    /**
     * #434 (Council P1-08): record attendance for a booking.
     *
     * Only the OWNING agency may record attendance (tenant check mirrors
     * loadPaymentReviewContext, resolved from the agency profile — never
     * from client input), and only once the trip has started: attendance
     * is a departure fact, not a forecast. Eligible source states are
     * CONFIRMED (recording attended completes the booking) and COMPLETED
     * (the date-based job may complete a booking first; the agency can
     * still record attendance afterwards — that recording is what makes
     * the booking review-eligible, and recording NO_SHOW moves it out
     * of COMPLETED into NO_SHOW).
     *
     * Recording is one-shot: replaying the SAME outcome is idempotent,
     * but a recorded outcome cannot be flipped through this endpoint —
     * attendance is the review-eligibility fact, so silent flips would
     * let a no-show be rewritten into a reviewable attendance (or the
     * reverse). Corrections are an admin/audit matter, not a toggle.
     */
    async markAttendance(bookingId: string, tenantId: string, actorUserId: string, attended: boolean) {
        if (typeof attended !== 'boolean') {
            throw new BadRequestException('attended must be a boolean');
        }
        const outcome = attended ? 'ATTENDED' : 'NO_SHOW';

        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: { session: { include: { template: true } } },
        });
        if (!booking) throw new BadRequestException('Booking not found');

        const agency = await this.db.agencyProfile.findUnique({
            where: { id: tenantId },
        });
        if (!agency || booking.session.template.agencyId !== agency.id) {
            throw new ForbiddenException('Forbidden');
        }

        if (booking.attendance) {
            if (booking.attendance === outcome) {
                return booking;
            }
            throw new BadRequestException('Attendance has already been recorded for this booking');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
            throw new BadRequestException('Attendance can only be recorded for a confirmed booking');
        }

        if (booking.session.startDate > new Date()) {
            throw new BadRequestException('Attendance cannot be recorded before the trip starts');
        }

        const claimed = await this.db.booking.updateMany({
            where: { id: bookingId, status: booking.status, attendance: null },
            data: {
                status: attended ? 'COMPLETED' : 'NO_SHOW',
                attendance: outcome,
                attendanceRecordedAt: new Date(),
                attendanceRecordedBy: actorUserId ?? null,
            },
        });
        if (claimed.count !== 1) {
            throw new BadRequestException('Attendance has already been recorded for this booking');
        }

        await this.db.auditLog
            .create({
                data: {
                    actorId: actorUserId ?? null,
                    action: 'BOOKING_ATTENDANCE_RECORDED',
                    targetType: 'Booking',
                    targetId: bookingId,
                    metadata: { attendance: outcome, agencyId: agency.id },
                },
            })
            .catch((err: unknown) => console.error('Audit log failed', err));

        return this.db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    }

    async cancelBooking(bookingId: string, travelerId: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: { session: true }
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (booking.travelerId !== travelerId) {
            throw new ForbiddenException('Forbidden');
        }

        // Paid bookings require the admin refund workflow so the wallet and
        // payment provider remain consistent.
        const cancellableStatuses = new Set(['PENDING', 'AWAITING_VALIDATION', 'REJECTED']);
        if (!cancellableStatuses.has(booking.status)) {
            throw new BadRequestException('Booking cannot be cancelled');
        }

        return this.db.$transaction(async (tx) => {
            const cancelled = await tx.booking.updateMany({
                where: {
                    id: bookingId,
                    travelerId,
                    status: { in: ['PENDING', 'AWAITING_VALIDATION', 'REJECTED'] },
                },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                    cancelledBy: travelerId,
                },
            });
            if (cancelled.count !== 1) {
                throw new BadRequestException('Booking cannot be cancelled');
            }

            // #369: an unpaid staged booking's plan dies with the booking.
            // (Deposit-paid bookings are not traveller-cancellable here —
            // they follow the refund workflow.)
            await tx.bookingPaymentPlan.updateMany({
                where: { bookingId, status: BookingPaymentPlanStatus.DEPOSIT_DUE },
                data: { status: BookingPaymentPlanStatus.CANCELLED },
            });

            await tx.tripSession.update({
                where: { id: booking.sessionId },
                data: {
                    availableSeats: {
                        increment: booking.guestsCount
                    }
                }
            });

            return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
        });
    }
}




