import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, PaymentMethodEnum } from './dto/create-booking.dto';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import { BookingPaymentStatus, PaymentMethod, TransactionType } from '@ouiboo/database';
import { mapBookingDetails } from './booking-response.util';
import { multiplyMoney } from '../common/money.util';

const DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS = 24;

@Injectable()
export class BookingsService {
    constructor(
        private db: DatabaseService,
        private emailService: EmailService,
        private uploadService: UploadService,
    ) { }

    async create(travelerId: string, dto: CreateBookingDto) {
        const session = await this.db.tripSession.findUnique({
            where: { id: dto.sessionId },
            include: { template: { include: { agency: true } } }
        });

        if (!session) {
            throw new BadRequestException('Session not found');
        }

        return this.db.$transaction(async (tx) => {
            // 1. Check for duplicates
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

            // 2. Atomic update to reserve seats (Concurrent Safe)
            // returning count helps know if it succeeded
            const result = await tx.tripSession.updateMany({
                where: {
                    id: dto.sessionId,
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
            });

            console.log(`[BookingsService] Created booking ${booking.id} for session ${dto.sessionId}. Travelers: ${dto.guestsCount}`);

            // Send Email Notifications (Async)
            const traveler = await tx.user.findUnique({ where: { id: travelerId } });
            const agencyUser = await tx.user.findUnique({ where: { id: sessionWithInfo.template.agency.userId } });

            if (traveler && agencyUser) {
                this.emailService.sendBookingNotification(
                    traveler.email,
                    agencyUser.email,
                    booking.id,
                    sessionWithInfo.template.title
                ).catch(err => console.error('Failed to send booking email', err));
            }

            return booking;
        });
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
        // 1. Get Booking and verify Agency ownership
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentProof: true
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

        return this.db.$transaction(async (tx) => {
            // Update Proof Status
            await tx.paymentProof.update({
                where: { id: booking.paymentProofId },
                data: {
                    status: approved ? 'VERIFIED' : 'REJECTED',
                    rejectionReason: approved ? null : rejectionReason,
                }
            });

            // Update Booking Status
            const newStatus = approved ? 'CONFIRMED' : 'REJECTED';
            const confirmedAt = approved ? new Date() : null;

            console.log(`[BookingsService] Payment verification for booking ${bookingId}: ${approved ? 'APPROVED' : 'REJECTED'}`);

            if (approved) {
                const wallet = await tx.wallet.upsert({
                    where: { agencyId: booking.session.template.agencyId },
                    update: {
                        availableBalance: {
                            increment: booking.totalAmount,
                        },
                    },
                    create: {
                        agencyId: booking.session.template.agencyId,
                    availableBalance: booking.totalAmount,
                        pendingBalance: 0,
                    },
                });

                await tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: booking.totalAmount,
                        type: TransactionType.BOOKING,
                        reason: `Manual payment confirmed for booking ${bookingId}`,
                        referenceId: bookingId,
                    },
                });

                // Send Payment Confirmation Email (Async)
                const traveler = await tx.user.findUnique({ where: { id: booking.travelerId } });
                if (traveler) {
                    this.emailService.sendPaymentConfirmation(
                        traveler.email,
                        booking.session.template.title
                    ).catch(err => console.error('Failed to send payment confirmation email', err));
                }
            }

            return tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: newStatus,
                    paymentStatus: approved ? BookingPaymentStatus.PAID : BookingPaymentStatus.FAILED,
                    confirmedAt,
                }
            });
        });
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

        const cancellableStatuses = new Set(['PENDING', 'AWAITING_VALIDATION', 'CONFIRMED']);
        if (!cancellableStatuses.has(booking.status)) {
            throw new BadRequestException('Booking cannot be cancelled');
        }

        return this.db.$transaction(async (tx) => {
            await tx.tripSession.update({
                where: { id: booking.sessionId },
                data: {
                    availableSeats: {
                        increment: booking.guestsCount
                    }
                }
            });

            return tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                }
            });
        });
    }
}
