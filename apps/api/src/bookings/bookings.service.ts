import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, PaymentMethodEnum } from './dto/create-booking.dto';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import { BookingPaymentStatus, PaymentMethod, TransactionType } from '@ouiboo/database';
import { mapBookingDetails } from './booking-response.util';
import { multiplyMoney } from '../common/money.util';
import { WalletsService } from '../wallets/wallets.service';

const DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS = 24;

@Injectable()
export class BookingsService {
    constructor(
        private db: DatabaseService,
        private emailService: EmailService,
        private uploadService: UploadService,
        private walletsService: WalletsService,
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
        if (dto.paymentMethod === PaymentMethodEnum.WALLET) {
            throw new BadRequestException('Traveler wallet payments are not available');
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
                    review: {
                        select: {
                            id: true,
                        },
                    },
                },
            });

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

    async findAllByTraveler(travelerId: string) {
        const bookings = await this.db.booking.findMany({
            where: { travelerId },
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
        });

        return bookings.map(mapBookingDetails);
    }

    async findOneForUser(bookingId: string, userId: string, role?: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentProof: true,
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

    async findAllByAgency(tenantId: string) {
        const bookings = await this.db.booking.findMany({
            where: {
                session: {
                    template: {
                        agencyId: tenantId,
                    },
                },
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
                        name: true,
                        email: true,
                    },
                },
                paymentProof: true,
                review: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        return bookings.map(mapBookingDetails);
    }

    async uploadPaymentProof(bookingId: string, userId: string, file: Express.Multer.File) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
            },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (booking.travelerId !== userId) {
            throw new ForbiddenException('Forbidden');
        }

        const allowedStatuses = new Set(['PENDING', 'REJECTED', 'AWAITING_VALIDATION']);
        if (!allowedStatuses.has(booking.status)) {
            throw new BadRequestException('Booking cannot accept payment proof');
        }

        if (booking.status !== 'AWAITING_VALIDATION' && this.isPaymentProofExpired(booking.bookingDate)) {
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

        const filePath = await this.uploadService.getFilePath(booking.paymentProof.imageUrl);

        return { filePath };
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

    async verifyPayment(bookingId: string, tenantId: string, approved: boolean, rejectionReason?: string) {
        if (typeof approved !== 'boolean') {
            throw new BadRequestException('approved must be a boolean');
        }

        // 1. Get Booking and verify Agency ownership
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentProof: true,
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

        if (booking.paymentProof.status !== 'PENDING') {
            throw new BadRequestException('Payment proof has already been reviewed');
        }

        if (booking.status !== 'AWAITING_VALIDATION') {
            throw new BadRequestException('Booking is not awaiting payment validation');
        }

        if (!approved && !rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting a payment');
        }

        const updatedBooking = await this.db.$transaction(async (tx) => {
            const claimedProof = await tx.paymentProof.updateMany({
                where: { id: booking.paymentProofId, status: 'PENDING' },
                data: {
                    status: approved ? 'VERIFIED' : 'REJECTED',
                    rejectionReason: approved ? null : rejectionReason,
                }
            });
            if (claimedProof.count !== 1) {
                throw new BadRequestException('Payment proof has already been reviewed');
            }

            const newStatus = approved ? 'CONFIRMED' : 'REJECTED';
            const confirmedAt = approved ? new Date() : null;

            if (approved) {
                await this.walletsService.creditWalletInTransaction(
                    tx,
                    booking.session.template.agencyId,
                    booking.totalAmount,
                    `Manual payment confirmed for booking ${bookingId}`,
                    {
                        idempotencyKey: `booking:${bookingId}:manual-payment-credit`,
                        referenceId: bookingId,
                        type: TransactionType.BOOKING,
                    },
                );
            }

            const claimedBooking = await tx.booking.updateMany({
                where: { id: bookingId, status: 'AWAITING_VALIDATION' },
                data: {
                    status: newStatus,
                    paymentStatus: approved ? BookingPaymentStatus.PAID : BookingPaymentStatus.FAILED,
                    confirmedAt,
                }
            });
            if (claimedBooking.count !== 1) {
                throw new BadRequestException('Booking is not awaiting payment validation');
            }

            return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
        });

        if (approved && booking.traveler?.email) {
            this.emailService.sendPaymentConfirmation(
                booking.traveler.email,
                booking.session.template.title,
            ).catch(() => undefined);
        }

        return updatedBooking;
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




