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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let WishlistService = class WishlistService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addToWishlist(userId, tripId) {
        const trip = await this.prisma.tripTemplate.findUnique({
            where: { id: tripId },
        });
        if (!trip) {
            throw new common_1.BadRequestException('Trip not found');
        }
        try {
            const wishlist = await this.prisma.wishlist.create({
                data: {
                    userId,
                    tripTemplateId: tripId,
                },
                include: { tripTemplate: true },
            });
            return wishlist;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.BadRequestException('Trip already in wishlist');
            }
            throw error;
        }
    }
    async removeFromWishlist(userId, tripId) {
        const wishlist = await this.prisma.wishlist.findUnique({
            where: {
                userId_tripTemplateId: {
                    userId,
                    tripTemplateId: tripId,
                },
            },
        });
        if (!wishlist) {
            throw new common_1.BadRequestException('Trip not in wishlist');
        }
        await this.prisma.wishlist.delete({
            where: {
                userId_tripTemplateId: {
                    userId,
                    tripTemplateId: tripId,
                },
            },
        });
        return { success: true };
    }
    async getUserWishlist(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [wishlists, total] = await Promise.all([
            this.prisma.wishlist.findMany({
                where: { userId },
                include: {
                    tripTemplate: {
                        include: {
                            agency: { select: { id: true, companyName: true, logo: true } },
                            sessions: {
                                where: {
                                    status: 'OPEN',
                                },
                                select: { id: true, startDate: true, endDate: true, price: true },
                                orderBy: { startDate: 'asc' },
                                take: 3,
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.wishlist.count({
                where: { userId },
            }),
        ]);
        return {
            wishlists,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    async isInWishlist(userId, tripId) {
        const wishlist = await this.prisma.wishlist.findUnique({
            where: {
                userId_tripTemplateId: {
                    userId,
                    tripTemplateId: tripId,
                },
            },
        });
        return !!wishlist;
    }
    async getWishlistCount(userId) {
        return this.prisma.wishlist.count({
            where: { userId },
        });
    }
    async getMostWishlistedTrips(limit = 10) {
        const wishlists = await this.prisma.wishlist.groupBy({
            by: ['tripTemplateId'],
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: limit,
        });
        const tripIds = wishlists.map((w) => w.tripTemplateId);
        const trips = await this.prisma.tripTemplate.findMany({
            where: {
                id: {
                    in: tripIds,
                },
            },
            include: {
                agency: { select: { id: true, companyName: true, logo: true } },
            },
        });
        return trips;
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map