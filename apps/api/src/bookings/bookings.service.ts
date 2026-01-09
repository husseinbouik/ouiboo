import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
    constructor(private db: DatabaseService) { }

    async create(travelerId: string, dto: CreateBookingDto) {
        const session = await this.db.tripSession.findUnique({
            where: { id: dto.sessionId },
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
            // Re-fetch session for price info (or pass it in if we trust it doesn't change much, safer to fetch)
            const session = await tx.tripSession.findUnique({ where: { id: dto.sessionId } });

            const booking = await tx.booking.create({
                data: {
                    sessionId: dto.sessionId,
                    travelerId,
                    guestsCount: dto.guestsCount,
                    totalAmount: session.price * dto.guestsCount,
                    status: 'PENDING',
                },
            });

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
            },
        });
    }

    async uploadPaymentProof(bookingId: string, travelerId: string, imageUrl: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (booking.travelerId !== travelerId) {
            throw new BadRequestException('Unauthorized: You can only upload proof for your own bookings');
        }

        return this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.create({
                data: {
                    bookingId,
                    imageUrl,
                    status: 'PENDING',
                },
            });

            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'PENDING_PAYMENT',
                    paymentProofId: proof.id,
                },
            });

            return proof;
        });
    }
}
