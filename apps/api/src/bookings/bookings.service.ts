import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';

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

            // 3. Create booking
            // Re-fetch session with template/agency info for email notifications
            const sessionWithInfo = await tx.tripSession.findUnique({
                where: { id: dto.sessionId },
                include: { template: { include: { agency: true } } }
            });

            const booking = await tx.booking.create({
                data: {
                    sessionId: dto.sessionId,
                    travelerId,
                    guestsCount: dto.guestsCount,
                    totalAmount: sessionWithInfo.price * dto.guestsCount,
                    status: 'PENDING',
                    fullName: dto.fullName,
                    phoneNumber: dto.phoneNumber,
                    documentNumber: dto.documentNumber,
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
        return this.db.booking.findMany({
            where: { travelerId },
            include: {
                session: {
                    include: {
                        template: true,
                    },
                },
                paymentProof: true,
            },
        });
    }

    async findAllByAgency(agencyId: string) {
        return this.db.booking.findMany({
            where: {
                session: {
                    template: {
                        agencyId,
                    },
                },
            },
            include: {
                session: {
                    include: {
                        template: true,
                    },
                },
                traveler: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                paymentProof: true,
            },
        });
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

        const agency = await this.db.agencyProfile.findUnique({ where: { userId } });
        const isTraveler = booking.travelerId === userId;
        const isAgencyOwner = agency && booking.session.template.agencyId === agency.id;

        if (!isTraveler && !isAgencyOwner) {
            throw new BadRequestException('Unauthorized: Booking does not belong to you');
        }

        if (booking.paymentProofId) {
            throw new BadRequestException('Payment proof already uploaded');
        }

        const uploadResult = await this.uploadService.uploadFile(file, `payment-proofs/${bookingId}`);
        const downloadUrl = this.buildPaymentProofDownloadUrl(bookingId);

        return this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.create({
                data: {
                    bookingId,
                    imageUrl: uploadResult.filename,
                    status: 'PENDING',
                },
            });

            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'PENDING_PAYMENT',
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

    async getPaymentProofFile(bookingId: string, userId: string) {
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

        if (!isTraveler && !isAgencyOwner) {
            throw new BadRequestException('Unauthorized: Booking does not belong to you');
        }

        if (!booking.paymentProof) {
            throw new BadRequestException('No payment proof uploaded');
        }

        const filePath = this.uploadService.getFilePath(booking.paymentProof.imageUrl);

        return { filePath };
    }

    private buildPaymentProofDownloadUrl(bookingId: string) {
        const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
        return `${apiUrl}/bookings/${bookingId}/payment-proof/download`;
    }

    async verifyPayment(bookingId: string, agencyUserId: string, approved: boolean) {
        // 1. Get Booking and verify Agency ownership
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentProof: true
            }
        });

        if (!booking) throw new BadRequestException('Booking not found');

        const agency = await this.db.agencyProfile.findUnique({ where: { userId: agencyUserId } });
        if (!agency || booking.session.template.agencyId !== agency.id) {
            throw new BadRequestException('Unauthorized: Booking does not belong to your agency');
        }

        if (!booking.paymentProof) {
            throw new BadRequestException('No payment proof uploaded');
        }

        return this.db.$transaction(async (tx) => {
            // Update Proof Status
            await tx.paymentProof.update({
                where: { id: booking.paymentProofId },
                data: { status: approved ? 'VERIFIED' : 'REJECTED' }
            });

            // Update Booking Status
            const newStatus = approved ? 'CONFIRMED' : 'PENDING_PAYMENT';

            console.log(`[BookingsService] Payment verification for booking ${bookingId}: ${approved ? 'APPROVED' : 'REJECTED'}`);

            if (approved) {
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
                data: { status: newStatus }
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
            throw new BadRequestException('Unauthorized: You can only cancel your own bookings');
        }

        const cancellableStatuses = new Set(['PENDING', 'PENDING_PAYMENT', 'CONFIRMED']);
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
                data: { status: 'CANCELLED' }
            });
        });
    }
}
