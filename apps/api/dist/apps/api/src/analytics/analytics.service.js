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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRevenueTrends(agencyId, startDate, endDate, period = 'daily') {
        const bookings = await this.prisma.booking.findMany({
            where: {
                status: 'COMPLETED',
                session: {
                    template: {
                        agencyId,
                    },
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                totalAmount: true,
                createdAt: true,
            },
        });
        const trends = this.groupByPeriod(bookings, period);
        return trends;
    }
    async getConversionFunnel(agencyId, startDate, endDate) {
        const sessions = await this.prisma.tripSession.count({
            where: {
                template: { agencyId },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const bookings = await this.prisma.booking.count({
            where: {
                session: {
                    template: { agencyId },
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const confirmed = await this.prisma.booking.count({
            where: {
                status: 'CONFIRMED',
                session: {
                    template: { agencyId },
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const completed = await this.prisma.booking.count({
            where: {
                status: 'COMPLETED',
                session: {
                    template: { agencyId },
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        return {
            views: sessions,
            bookingAttempts: bookings,
            confirmed,
            completed,
            conversionRate: sessions > 0 ? (completed / sessions) * 100 : 0,
        };
    }
    async getTopTrips(agencyId, limit = 10) {
        const trips = await this.prisma.tripTemplate.findMany({
            where: { agencyId },
            include: {
                sessions: {
                    select: {
                        bookings: {
                            select: {
                                totalAmount: true,
                            },
                        },
                    },
                },
                reviews: {
                    select: { rating: true },
                },
            },
            orderBy: {
                reviews: {
                    _count: 'desc',
                },
            },
            take: limit,
        });
        return trips.map((trip) => {
            const totalBookings = trip.sessions.reduce((acc, session) => acc + session.bookings.length, 0);
            const totalRevenue = trip.sessions.reduce((acc, session) => acc +
                session.bookings.reduce((sum, booking) => sum + booking.totalAmount, 0), 0);
            const avgRating = trip.reviews.length > 0
                ? trip.reviews.reduce((sum, r) => sum + r.rating, 0) /
                    trip.reviews.length
                : 0;
            return {
                id: trip.id,
                title: trip.title,
                bookings: totalBookings,
                revenue: totalRevenue,
                avgRating,
                reviewCount: trip.reviews.length,
            };
        });
    }
    async getPaymentMethodDistribution(agencyId) {
        const payments = await this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId },
                },
            },
            select: { paymentMethod: true },
        });
        const distribution = {
            MANUAL: 0,
            GATEWAY: 0,
        };
        payments.forEach((payment) => {
            distribution[payment.paymentMethod]++;
        });
        return distribution;
    }
    async getCustomerDemographics(agencyId) {
        const bookings = await this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId },
                },
            },
            include: {
                traveler: true,
            },
            distinct: ['travelerId'],
        });
        const repeatCustomers = await this.prisma.booking.groupBy({
            by: ['travelerId'],
            where: {
                session: {
                    template: { agencyId },
                },
            },
            _count: {
                id: true,
            },
            having: {
                id: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });
        return {
            totalCustomers: bookings.length,
            repeatCustomers: repeatCustomers.length,
            repeatCustomerRate: bookings.length > 0
                ? (repeatCustomers.length / bookings.length) * 100
                : 0,
        };
    }
    async getPlatformMetrics() {
        const [totalRevenue, totalBookings, totalAgencies, totalTravelers, avgBookingValue] = await Promise.all([
            this.prisma.booking.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { totalAmount: true },
            }),
            this.prisma.booking.count({
                where: { status: 'COMPLETED' },
            }),
            this.prisma.agencyProfile.count(),
            this.prisma.user.count({
                where: { role: 'TRAVELER' },
            }),
            this.prisma.booking.aggregate({
                where: { status: 'COMPLETED' },
                _avg: { totalAmount: true },
            }),
        ]);
        return {
            gmv: totalRevenue._sum.totalAmount || 0,
            totalBookings,
            totalAgencies,
            totalTravelers,
            avgBookingValue: Math.round(avgBookingValue._avg.totalAmount || 0),
        };
    }
    groupByPeriod(bookings, period) {
        const grouped = {};
        bookings.forEach((booking) => {
            let key;
            if (period === 'daily') {
                key = booking.createdAt.toISOString().split('T')[0];
            }
            else if (period === 'weekly') {
                const date = new Date(booking.createdAt);
                const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
                key = weekStart.toISOString().split('T')[0];
            }
            else {
                key = booking.createdAt.toISOString().slice(0, 7);
            }
            grouped[key] = (grouped[key] || 0) + booking.totalAmount;
        });
        return Object.entries(grouped).map(([date, amount]) => ({
            date,
            amount,
        }));
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map