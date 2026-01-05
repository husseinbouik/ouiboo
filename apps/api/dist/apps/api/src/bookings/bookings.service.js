"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let BookingsService = class BookingsService {
    constructor(db) {
        this.db = db;
    }
    async create(travelerId, dto) {
        const session = await this.db.tripSession.findUnique({
            where: { id: dto.sessionId },
        });
        if (!session || session.availableSeats < dto.guestsCount) {
            throw new common_1.BadRequestException('Not enough seats available');
        }
        return this.db.$transaction(async (tx) => {
            const booking = await tx.booking.create({
                data: {
                    sessionId: dto.sessionId,
                    travelerId,
                    guestsCount: dto.guestsCount,
                    totalAmount: session.price * dto.guestsCount,
                    status: 'PENDING',
                },
            });
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
    async findAllByTraveler(travelerId) {
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
    async findAllByAgency(agencyId) {
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
    async uploadPaymentProof(bookingId, imageUrl) {
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
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map