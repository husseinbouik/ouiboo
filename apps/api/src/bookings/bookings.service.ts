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

        if (!session || session.availableSeats < dto.guestsCount) {
            throw new BadRequestException('Not enough seats available');
        }

        return this.db.$transaction(async (tx) => {
            // Create booking
            const booking = await tx.booking.create({
                data: {
                    sessionId: dto.sessionId,
                    travelerId,
                    guestsCount: dto.guestsCount,
                    totalAmount: session.price * dto.guestsCount,
                    status: 'PENDING',
                },
            });

            // Update seats
            await tx.tripSession.update({
                where: { id: dto.sessionId },
                data: {
                    availableSeats: {
                        decrement: dto.guestsCount,
                    },
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

    async uploadPaymentProof(bookingId: string, imageUrl: string) {
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
