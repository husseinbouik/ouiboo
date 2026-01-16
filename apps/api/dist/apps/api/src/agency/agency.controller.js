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
exports.AgencyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const types_1 = require("@ouiboo/types");
const database_service_1 = require("../database/database.service");
let AgencyController = class AgencyController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(req) {
        const agencyId = req.tenantId;
        const [tripsCount, bookings, wallet] = await Promise.all([
            this.prisma.tripTemplate.count({
                where: { agencyId, status: 'ACTIVE' },
            }),
            this.prisma.booking.findMany({
                where: {
                    session: {
                        template: { agencyId }
                    },
                },
                select: {
                    totalAmount: true,
                    status: true,
                    travelerId: true,
                }
            }),
            this.prisma.wallet.findUnique({
                where: { agencyId }
            })
        ]);
        const revenue = bookings
            .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
            .reduce((sum, b) => sum + b.totalAmount, 0);
        const uniqueCustomers = new Set(bookings.map(b => b.travelerId)).size;
        return {
            revenue,
            activeTrips: tripsCount,
            totalBookings: bookings.length,
            totalCustomers: uniqueCustomers,
            wallet: wallet || { availableBalance: 0, pendingBalance: 0 }
        };
    }
    async getTrips(req) {
        const agencyId = req.tenantId;
        return this.prisma.tripTemplate.findMany({
            where: { agencyId },
            include: {
                sessions: {
                    include: {
                        _count: {
                            select: { bookings: true }
                        }
                    }
                }
            }
        });
    }
    async getBookings(req) {
        const agencyId = req.tenantId;
        return this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId }
                },
            },
            include: {
                session: {
                    include: {
                        template: true
                    }
                },
                traveler: {
                    select: {
                        name: true,
                        email: true,
                    }
                },
                paymentProof: true
            },
            orderBy: {
                bookingDate: 'desc'
            }
        });
    }
    async getPayouts(req) {
        const agencyId = req.tenantId;
        return this.prisma.payoutRequest.findMany({
            where: { agencyId },
            orderBy: { requestedAt: 'desc' },
            take: 20
        });
    }
    async updateProfile(req, data) {
        return this.prisma.agencyProfile.update({
            where: { id: req.tenantId },
            data: {
                companyName: data.companyName,
                bio: data.bio,
                logo: data.logo,
                bankDetails: data.bankDetails
            }
        });
    }
};
exports.AgencyController = AgencyController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get agency dashboard stats' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgencyController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('trips'),
    (0, swagger_1.ApiOperation)({ summary: 'Get agency trips' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgencyController.prototype, "getTrips", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get agency bookings' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgencyController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Get)('payouts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get agency payout history' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgencyController.prototype, "getPayouts", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Update agency profile' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgencyController.prototype, "updateProfile", null);
exports.AgencyController = AgencyController = __decorate([
    (0, swagger_1.ApiTags)('Agency'),
    (0, common_1.Controller)('agency'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_guard_1.TenantGuard),
    (0, roles_decorator_1.Roles)(types_1.UserRole.Agency),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AgencyController);
//# sourceMappingURL=agency.controller.js.map