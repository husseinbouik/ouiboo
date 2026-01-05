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
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const types_1 = require("@ouiboo/types");
const database_service_1 = require("../database/database.service");
let AgencyController = class AgencyController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(req) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!agency) {
            return {
                revenue: 0,
                activeTrips: 0,
                totalBookings: 0,
                totalCustomers: 0,
            };
        }
        const [tripsCount, bookings, wallet] = await Promise.all([
            this.prisma.tripTemplate.count({
                where: { agencyId: agency.id, status: 'ACTIVE' },
            }),
            this.prisma.booking.findMany({
                where: {
                    session: {
                        template: { agencyId: agency.id }
                    },
                },
                select: {
                    totalAmount: true,
                    status: true,
                    travelerId: true,
                }
            }),
            this.prisma.wallet.findUnique({
                where: { agencyId: agency.id }
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
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!agency)
            return [];
        return this.prisma.tripTemplate.findMany({
            where: { agencyId: agency.id },
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
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!agency)
            return [];
        return this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId: agency.id }
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
                }
            },
            orderBy: {
                bookingDate: 'desc'
            }
        });
    }
    async getPayouts(req) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!agency)
            return [];
        return this.prisma.payoutRequest.findMany({
            where: { agencyId: agency.id },
            orderBy: { requestedAt: 'desc' },
            take: 20
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
exports.AgencyController = AgencyController = __decorate([
    (0, swagger_1.ApiTags)('Agency'),
    (0, common_1.Controller)('agency'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(types_1.UserRole.Agency),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AgencyController);
//# sourceMappingURL=agency.controller.js.map