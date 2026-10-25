import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, PaymentMethodEnum } from './dto/create-booking.dto';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import { BookingPaymentPlanStatus, BookingPaymentStatus, ExternalPaymentStage, PaymentCustodian, PaymentLedgerSource, PaymentMethod, SessionGroupStatus } from '@ouiboo/database';
import { mapBookingDetails } from './booking-response.util';
import { decimalEqualsMoney, multiplyMoney, toMoneyDecimal } from '../common/money.util';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';

const DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS = 24;

@Injectable()
export class BookingsService {
    constructor(
        private db: DatabaseService,
        private emailService: EmailService,
        private uploadService: UploadService,
        private externalPaymentsService: ExternalPaymentsService,
        private stagedPaymentsService: StagedPaymentsService,
    ) { }

    async create(travelerId: string, dto: CreateBookingDto) {
        if (!dto?.sessionId || typeof dto.sessionId !== 'string') {
            throw new BadRequestException('sessionId is required');
        }

        if (!Number.isInteger(dto.guestsCount) || dto.guestsCount <= 0) {
            throw new BadRequestException('guestsCount must be a positive integer');
        }

        for (const [field, value] of Object.entries({ fullName: dto.fullName, phoneNumber: dto.phoneNumber, documentNumber: dto.documentNumber })) {
            if (typeof value !== 'string' || value.trim().length === 0) {
                throw new BadRequestException(field + ' is required');
            }
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

        const transactionResult = await this.db.$transaction(async (tx) => {

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

            const booking = await tx.booking.create({
                data: {
                    sessionId: dto.sessionId,
                    travelerId,
                    guestsCount: dto.guestsCount,
                    totalAmount,
                    currency: sessionWithInfo.currency || 'MAD',
                    status: 'PENDING',
                    fullName: dto.fullName,
                    phoneNumber: dto.phoneNumber,
                    documentNumber: dto.documentNumber,
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
                    }
                    : null,
            };
        });

        if (transactionResult.notification) {
            const notification = transactionResult.notification;
            this.emailService.sendBookingNotification(
                notification.travelerEmail,
                notification.agencyEmail,
                notification.bookingId,
                notification.tripTitle,
            ).catch(() => undefined);
        }

        return transactionResult.booking;
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
            data: bookings.map(mapBookingDetails),
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            },
        };
    }

    async findOneForUser(bookingId: string, userId: string, role?: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentProof: true,
                paymentPlan: true,
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

        return mapBookingDetails(booking);
    }

    async uploadPaymentProof(bookingId: string, userId: string, file: Express.Multer.File) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentPlan: true,
            },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (booking.travelerId !== userId) {
            throw new ForbiddenException('Forbidden');
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
                },
                create: {
                    bookingId,
                    imageUrl: uploadResult.filename,
                    status: 'PENDING',
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
        const apiUrl = process.env.API_URL || 'http://localhost:3000/api/v1';
        return `${apiUrl}/bookings/${bookingId}/payment-proof/download`;
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
            this.emailService.sendPaymentConfirmation(
                booking.traveler.email,
                booking.session.template.title,
            ).catch(() => undefined);
        }

        return updatedBooking.booking;
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




