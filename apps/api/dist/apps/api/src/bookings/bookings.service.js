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
const types_1 = require("@ouiboo/types");
const database_service_1 = require("../database/database.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const email_service_1 = require("../email/email.service");
const upload_service_1 = require("../upload/upload.service");
const database_1 = require("@ouiboo/database");
const DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS = 24;
let BookingsService = class BookingsService {
    constructor(db, emailService, uploadService) {
        this.db = db;
        this.emailService = emailService;
        this.uploadService = uploadService;
    }
    async create(travelerId, dto) {
        const session = await this.db.tripSession.findUnique({
            where: { id: dto.sessionId },
            include: { template: { include: { agency: true } } }
        });
        if (!session) {
            throw new common_1.BadRequestException('Session not found');
        }
        return this.db.$transaction(async (tx) => {
            const existing = await tx.booking.findFirst({
                where: {
                    sessionId: dto.sessionId,
                    travelerId,
                    status: { not: 'CANCELLED' }
                }
            });
            if (existing) {
                throw new common_1.BadRequestException('You already have a booking for this session');
            }
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
                throw new common_1.BadRequestException('Not enough seats available');
            }
            const sessionWithInfo = await tx.tripSession.findUnique({
                where: { id: dto.sessionId },
                include: { template: { include: { agency: true } } }
            });
            const paymentMethodMap = {
                [create_booking_dto_1.PaymentMethodEnum.BANK_TRANSFER]: database_1.PaymentMethod.MANUAL,
                [create_booking_dto_1.PaymentMethodEnum.CARD]: database_1.PaymentMethod.GATEWAY,
                [create_booking_dto_1.PaymentMethodEnum.WALLET]: database_1.PaymentMethod.MANUAL,
                [create_booking_dto_1.PaymentMethodEnum.MOBILE_MONEY]: database_1.PaymentMethod.GATEWAY,
            };
            const persistedPaymentMethod = dto.paymentMethod
                ? paymentMethodMap[dto.paymentMethod]
                : database_1.PaymentMethod.MANUAL;
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
                    paymentMethod: persistedPaymentMethod,
                },
            });
            console.log(`[BookingsService] Created booking ${booking.id} for session ${dto.sessionId}. Travelers: ${dto.guestsCount}`);
            const traveler = await tx.user.findUnique({ where: { id: travelerId } });
            const agencyUser = await tx.user.findUnique({ where: { id: sessionWithInfo.template.agency.userId } });
            if (traveler && agencyUser) {
                this.emailService.sendBookingNotification(traveler.email, agencyUser.email, booking.id, sessionWithInfo.template.title).catch(err => console.error('Failed to send booking email', err));
            }
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
                paymentProof: true,
            },
        });
    }
    async findAllByAgency(tenantId) {
        return this.db.booking.findMany({
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
    async uploadPaymentProof(bookingId, userId, file) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
            },
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (booking.travelerId !== userId) {
            throw new common_1.ForbiddenException('Forbidden');
        }
        const allowedStatuses = new Set(['PENDING', 'REJECTED', 'AWAITING_VALIDATION']);
        if (!allowedStatuses.has(booking.status)) {
            throw new common_1.BadRequestException('Booking cannot accept payment proof');
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
            throw new common_1.BadRequestException('Booking has expired. Please create a new booking.');
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
    async getPaymentProofFile(bookingId, userId, role) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentProof: true,
                session: { include: { template: true } },
            },
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        const agency = await this.db.agencyProfile.findUnique({ where: { userId } });
        const isTraveler = booking.travelerId === userId;
        const isAgencyOwner = agency && booking.session.template.agencyId === agency.id;
        const isAdmin = role === types_1.UserRole.Admin;
        if (!isTraveler && !isAgencyOwner && !isAdmin) {
            throw new common_1.BadRequestException('Unauthorized: Booking does not belong to you');
        }
        if (!booking.paymentProof) {
            throw new common_1.BadRequestException('No payment proof uploaded');
        }
        const filePath = this.uploadService.getFilePath(booking.paymentProof.imageUrl);
        return { filePath };
    }
    isLocal() {
        return this.uploadService.isLocal();
    }
    buildPaymentProofDownloadUrl(bookingId) {
        const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
        return `${apiUrl}/bookings/${bookingId}/payment-proof/download`;
    }
    isPaymentProofExpired(bookingDate) {
        const hours = Number(process.env.PAYMENT_PROOF_EXPIRATION_HOURS);
        const normalizedHours = Number.isFinite(hours) && hours > 0
            ? hours
            : DEFAULT_PAYMENT_PROOF_EXPIRATION_HOURS;
        const expiresAt = new Date(bookingDate.getTime() + normalizedHours * 60 * 60 * 1000);
        return new Date() > expiresAt;
    }
    async verifyPayment(bookingId, tenantId, approved, rejectionReason) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
                paymentProof: true
            }
        });
        if (!booking)
            throw new common_1.BadRequestException('Booking not found');
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: tenantId }
        });
        if (!agency || booking.session.template.agencyId !== agency.id) {
            throw new common_1.ForbiddenException('Forbidden');
        }
        if (!booking.paymentProof) {
            throw new common_1.BadRequestException('No payment proof uploaded');
        }
        if (booking.paymentProof.status !== 'PENDING') {
            throw new common_1.BadRequestException('Payment proof has already been reviewed');
        }
        if (booking.status !== 'AWAITING_VALIDATION') {
            throw new common_1.BadRequestException('Booking is not awaiting payment validation');
        }
        if (!approved && !rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required when rejecting a payment');
        }
        return this.db.$transaction(async (tx) => {
            await tx.paymentProof.update({
                where: { id: booking.paymentProofId },
                data: {
                    status: approved ? 'VERIFIED' : 'REJECTED',
                    rejectionReason: approved ? null : rejectionReason,
                }
            });
            const newStatus = approved ? 'CONFIRMED' : 'REJECTED';
            console.log(`[BookingsService] Payment verification for booking ${bookingId}: ${approved ? 'APPROVED' : 'REJECTED'}`);
            if (approved) {
                const traveler = await tx.user.findUnique({ where: { id: booking.travelerId } });
                if (traveler) {
                    this.emailService.sendPaymentConfirmation(traveler.email, booking.session.template.title).catch(err => console.error('Failed to send payment confirmation email', err));
                }
            }
            return tx.booking.update({
                where: { id: bookingId },
                data: { status: newStatus }
            });
        });
    }
    async cancelBooking(bookingId, travelerId) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: { session: true }
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (booking.travelerId !== travelerId) {
            throw new common_1.ForbiddenException('Forbidden');
        }
        const cancellableStatuses = new Set(['PENDING', 'AWAITING_VALIDATION', 'CONFIRMED']);
        if (!cancellableStatuses.has(booking.status)) {
            throw new common_1.BadRequestException('Booking cannot be cancelled');
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
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        email_service_1.EmailService,
        upload_service_1.UploadService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map