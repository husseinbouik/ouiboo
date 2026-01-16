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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const database_service_1 = require("../database/database.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const types_1 = require("@ouiboo/types");
const wallets_service_1 = require("../wallets/wallets.service");
let AdminController = class AdminController {
    constructor(db, walletsService) {
        this.db = db;
        this.walletsService = walletsService;
    }
    getPendingPayments() {
        return this.db.paymentProof.findMany({
            where: { status: 'PENDING' },
            include: { booking: { include: { traveler: true, session: { include: { template: true } } } } }
        });
    }
    async verifyPayment(id, status, rejectionReason) {
        if (status === 'REJECTED' && !rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required when rejecting a payment');
        }
        return this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.findUnique({
                where: { id },
                include: { booking: { include: { session: { include: { template: true } } } } }
            });
            if (!proof) {
                throw new common_1.BadRequestException('Payment proof not found');
            }
            if (proof.status !== 'PENDING') {
                throw new common_1.BadRequestException('Payment proof has already been reviewed');
            }
            if (proof.booking.status !== 'AWAITING_VALIDATION') {
                throw new common_1.BadRequestException('Booking is not awaiting payment validation');
            }
            const updatedProof = await tx.paymentProof.update({
                where: { id },
                data: {
                    status,
                    rejectionReason: status === 'REJECTED' ? rejectionReason : null,
                }
            });
            const updatedBooking = await tx.booking.update({
                where: { id: proof.bookingId },
                data: { status: status === 'VERIFIED' ? 'CONFIRMED' : 'REJECTED' },
                include: { session: { include: { template: true } } }
            });
            if (status === 'VERIFIED') {
                await this.walletsService.creditWallet(updatedBooking.session.template.agencyId, updatedBooking.totalAmount, `Booking #${updatedBooking.id} confirmed`);
            }
            return updatedProof;
        });
    }
    getPendingAgencies() {
        return this.db.agencyProfile.findMany({
            where: { verificationStatus: 'PENDING' },
            include: { user: true }
        });
    }
    async verifyAgency(id, status) {
        return this.db.agencyProfile.update({
            where: { id },
            data: { verificationStatus: status }
        });
    }
    getPendingTrips() {
        return this.db.tripTemplate.findMany({
            where: { status: 'DRAFT' },
            include: { agency: true }
        });
    }
    async verifyTrip(id, status) {
        return this.db.tripTemplate.update({
            where: { id },
            data: { status: status }
        });
    }
    getAgencies() {
        return this.db.agencyProfile.findMany({
            include: { user: true }
        });
    }
    async updateAgencyStatus(id, data) {
        return this.db.agencyProfile.update({
            where: { id },
            data: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus
            }
        });
    }
    getBookings() {
        return this.db.booking.findMany({
            include: {
                traveler: true,
                session: { include: { template: true } },
                paymentProof: true
            },
            orderBy: { bookingDate: 'desc' }
        });
    }
    getPayoutRequests() {
        return this.db.payoutRequest.findMany({
            include: { agency: true }
        });
    }
    async processPayout(id, status) {
        return this.db.payoutRequest.update({
            where: { id },
            data: {
                status: status,
                processedAt: new Date()
            }
        });
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('pending-payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment proofs pending verification' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingPayments", null);
__decorate([
    (0, common_1.Post)('payments/:id/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject payment proof' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Body)('rejectionReason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Get)('pending-agencies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get agencies pending verification' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingAgencies", null);
__decorate([
    (0, common_1.Post)('agencies/:id/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject agency' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyAgency", null);
__decorate([
    (0, common_1.Get)('pending-trips'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trips pending verification' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingTrips", null);
__decorate([
    (0, common_1.Post)('trips/:id/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject trip' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyTrip", null);
__decorate([
    (0, common_1.Get)('agencies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all agencies' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAgencies", null);
__decorate([
    (0, common_1.Patch)('agencies/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update agency verification or subscription status' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateAgencyStatus", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bookings in the system' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Get)('payout-requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all payout requests' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPayoutRequests", null);
__decorate([
    (0, common_1.Post)('payouts/:id/process'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark payout as paid or rejected' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "processPayout", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(types_1.UserRole.Admin),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        wallets_service_1.WalletsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map