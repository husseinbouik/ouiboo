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
const email_service_1 = require("../email/email.service");
const audit_log_service_1 = require("./audit-log.service");
const parseEnumQuery = (value, allowedValues) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim().toUpperCase();
    return allowedValues.includes(normalized) ? normalized : undefined;
};
const parseDateQuery = (value) => {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};
const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
const buildAuditLogWhere = ({ fromDate, toDate, action, actorEmail, targetType, }) => {
    const where = {};
    if (fromDate || toDate) {
        where.createdAt = {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
        };
    }
    if (action) {
        where.action = action;
    }
    if (actorEmail) {
        where.actorEmail = { contains: actorEmail, mode: 'insensitive' };
    }
    if (targetType) {
        where.targetType = targetType;
    }
    return where;
};
const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};
const VERIFICATION_STATUSES = Object.values(types_1.VerificationStatus);
const SUBSCRIPTION_STATUSES = Object.values(types_1.SubscriptionStatus);
const BOOKING_STATUSES = Object.values(types_1.BookingStatus);
const PAYOUT_STATUSES = Object.values(types_1.PayoutStatus);
let AdminController = class AdminController {
    constructor(db, walletsService, emailService, auditLogService) {
        this.db = db;
        this.walletsService = walletsService;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }
    async getPendingPayments(q) {
        const search = q?.trim();
        const proofs = await this.db.paymentProof.findMany({
            where: {
                status: 'PENDING',
                ...(search ? {
                    OR: [
                        { booking: { id: { contains: search, mode: 'insensitive' } } },
                        { booking: { traveler: { name: { contains: search, mode: 'insensitive' } } } },
                        { booking: { traveler: { email: { contains: search, mode: 'insensitive' } } } },
                        { booking: { session: { template: { title: { contains: search, mode: 'insensitive' } } } } },
                    ],
                } : {}),
            },
            include: { booking: { include: { traveler: true, session: { include: { template: true } } } } }
        });
        const apiUrl = (process.env.API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
        return proofs.map((proof) => ({
            ...proof,
            downloadUrl: `${apiUrl}/bookings/${proof.bookingId}/payment-proof/download`,
        }));
    }
    async verifyPayment(req, id, status, rejectionReason) {
        if (status === 'REJECTED' && !rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required when rejecting a payment');
        }
        return this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.findUnique({
                where: { id },
                include: { booking: { include: { session: { include: { template: true } }, traveler: true } } }
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
                const travelerEmail = proof.booking?.traveler?.email;
                if (travelerEmail) {
                    await this.emailService.sendPaymentConfirmation(travelerEmail, updatedBooking.session.template.title);
                }
            }
            this.auditLogService.log({
                actorId: req?.user?.userId,
                actorEmail: req?.user?.email,
                action: 'PAYMENT_PROOF_VERIFIED',
                targetType: 'PaymentProof',
                targetId: proof.id,
                metadata: {
                    status,
                    bookingId: proof.bookingId,
                },
            }).catch((err) => console.error('Audit log failed', err));
            return updatedProof;
        });
    }
    getPendingAgencies(q) {
        const search = q?.trim();
        return this.db.agencyProfile.findMany({
            where: {
                verificationStatus: 'PENDING',
                ...(search ? {
                    OR: [
                        { companyName: { contains: search, mode: 'insensitive' } },
                        { ice: { contains: search, mode: 'insensitive' } },
                        { user: { email: { contains: search, mode: 'insensitive' } } },
                        { user: { name: { contains: search, mode: 'insensitive' } } },
                    ],
                } : {}),
            },
            include: { user: true }
        });
    }
    async verifyAgency(req, id, status) {
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: { verificationStatus: status }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_VERIFIED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }
    getPendingTrips(q) {
        const search = q?.trim();
        return this.db.tripTemplate.findMany({
            where: {
                status: 'DRAFT',
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { agency: { companyName: { contains: search, mode: 'insensitive' } } },
                    ],
                } : {}),
            },
            include: { agency: true }
        });
    }
    async verifyTrip(req, id, status) {
        const updated = await this.db.tripTemplate.update({
            where: { id },
            data: { status: status }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'TRIP_VERIFIED',
            targetType: 'TripTemplate',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }
    getAgencies(q, verificationStatus, subscriptionStatus) {
        const search = q?.trim();
        const verificationFilter = parseEnumQuery(verificationStatus, VERIFICATION_STATUSES);
        const subscriptionFilter = parseEnumQuery(subscriptionStatus, SUBSCRIPTION_STATUSES);
        return this.db.agencyProfile.findMany({
            where: {
                ...(verificationFilter ? { verificationStatus: verificationFilter } : {}),
                ...(subscriptionFilter ? { subscriptionStatus: subscriptionFilter } : {}),
                ...(search ? {
                    OR: [
                        { companyName: { contains: search, mode: 'insensitive' } },
                        { ice: { contains: search, mode: 'insensitive' } },
                        { user: { email: { contains: search, mode: 'insensitive' } } },
                        { user: { name: { contains: search, mode: 'insensitive' } } },
                    ],
                } : {}),
            },
            include: { user: true },
        });
    }
    async updateAgencyStatus(req, id, data) {
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus
            }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_STATUS_UPDATED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus,
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }
    getBookings(q, status) {
        const search = q?.trim();
        const statusFilter = parseEnumQuery(status, BOOKING_STATUSES);
        return this.db.booking.findMany({
            where: {
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(search ? {
                    OR: [
                        { id: { contains: search, mode: 'insensitive' } },
                        { traveler: { name: { contains: search, mode: 'insensitive' } } },
                        { traveler: { email: { contains: search, mode: 'insensitive' } } },
                        { session: { template: { title: { contains: search, mode: 'insensitive' } } } },
                    ],
                } : {}),
            },
            include: {
                traveler: true,
                session: { include: { template: true } },
                paymentProof: true
            },
            orderBy: { bookingDate: 'desc' }
        });
    }
    getPayoutRequests(q, status) {
        const search = q?.trim();
        const statusFilter = parseEnumQuery(status, PAYOUT_STATUSES);
        return this.db.payoutRequest.findMany({
            where: {
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(search ? {
                    OR: [
                        { id: { contains: search, mode: 'insensitive' } },
                        { agency: { companyName: { contains: search, mode: 'insensitive' } } },
                        { agency: { user: { email: { contains: search, mode: 'insensitive' } } } },
                    ],
                } : {}),
            },
            include: { agency: { include: { user: true } } }
        });
    }
    async processPayout(req, id, status) {
        const updated = await this.db.payoutRequest.update({
            where: { id },
            data: {
                status: status,
                processedAt: new Date()
            }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'PAYOUT_PROCESSED',
            targetType: 'PayoutRequest',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }
    async getAuditLogs(from, to, action, actorEmail, targetType, limit) {
        const fromDate = parseDateQuery(from);
        const toDate = parseDateQuery(to);
        const parsedLimit = Number(limit);
        const take = clampNumber(Number.isFinite(parsedLimit) ? parsedLimit : 100, 1, 200);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
        });
        return this.db.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
        });
    }
    async exportAuditLogs(req, res, from, to, action, actorEmail, targetType, limit) {
        const fromDate = parseDateQuery(from);
        const toDate = parseDateQuery(to);
        const parsedLimit = Number(limit);
        const take = clampNumber(Number.isFinite(parsedLimit) ? parsedLimit : 1000, 1, 5000);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
        });
        const logs = await this.db.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
        });
        const header = ['id', 'createdAt', 'actorId', 'actorEmail', 'action', 'targetType', 'targetId', 'metadata'];
        const rows = logs.map((log) => [
            log.id,
            log.createdAt.toISOString(),
            log.actorId || '',
            log.actorEmail || '',
            log.action,
            log.targetType,
            log.targetId || '',
            log.metadata ? JSON.stringify(log.metadata) : '',
        ]);
        const csv = [header.join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))].join('\n');
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AUDIT_LOG_EXPORTED',
            targetType: 'AuditLog',
            metadata: {
                from,
                to,
                action,
                actorEmail,
                targetType,
                count: logs.length,
            },
        }).catch((err) => console.error('Audit log failed', err));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send(csv);
    }
    async pruneAuditLogs(req, days) {
        const parsedDays = Number(days ?? process.env.AUDIT_LOG_RETENTION_DAYS);
        if (!Number.isFinite(parsedDays) || parsedDays < 1) {
            throw new common_1.BadRequestException('Retention days must be a positive number.');
        }
        const cutoff = new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000);
        const result = await this.db.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AUDIT_LOG_PRUNED',
            targetType: 'AuditLog',
            metadata: {
                retentionDays: parsedDays,
                deleted: result.count,
                cutoff: cutoff.toISOString(),
            },
        }).catch((err) => console.error('Audit log failed', err));
        return {
            deleted: result.count,
            cutoff,
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('pending-payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment proofs pending verification' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPendingPayments", null);
__decorate([
    (0, common_1.Post)('payments/:id/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject payment proof' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, common_1.Body)('rejectionReason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Get)('pending-agencies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get agencies pending verification' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingAgencies", null);
__decorate([
    (0, common_1.Post)('agencies/:id/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject agency' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyAgency", null);
__decorate([
    (0, common_1.Get)('pending-trips'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trips pending verification' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingTrips", null);
__decorate([
    (0, common_1.Post)('trips/:id/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject trip' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyTrip", null);
__decorate([
    (0, common_1.Get)('agencies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all agencies' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('verificationStatus')),
    __param(2, (0, common_1.Query)('subscriptionStatus')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAgencies", null);
__decorate([
    (0, common_1.Patch)('agencies/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update agency verification or subscription status' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateAgencyStatus", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bookings in the system' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Get)('payout-requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all payout requests' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPayoutRequests", null);
__decorate([
    (0, common_1.Post)('payouts/:id/process'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark payout as paid or rejected' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "processPayout", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'List audit logs with optional filters' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('actorEmail')),
    __param(4, (0, common_1.Query)('targetType')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('audit-logs/export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export audit logs as CSV' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('action')),
    __param(5, (0, common_1.Query)('actorEmail')),
    __param(6, (0, common_1.Query)('targetType')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportAuditLogs", null);
__decorate([
    (0, common_1.Post)('audit-logs/retention'),
    (0, swagger_1.ApiOperation)({ summary: 'Prune audit logs older than a retention window' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "pruneAuditLogs", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(types_1.UserRole.Admin),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        wallets_service_1.WalletsService,
        email_service_1.EmailService,
        audit_log_service_1.AuditLogService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map