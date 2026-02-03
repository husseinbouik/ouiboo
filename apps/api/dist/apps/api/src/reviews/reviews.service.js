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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let ReviewsService = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReview(bookingId, travelerId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { session: { include: { template: true } } },
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (booking.travelerId !== travelerId) {
            throw new common_1.ForbiddenException('Not authorized to review this booking');
        }
        if (booking.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Can only review completed bookings');
        }
        const existingReview = await this.prisma.review.findUnique({
            where: { bookingId },
        });
        if (existingReview) {
            throw new common_1.BadRequestException('Review already exists for this booking');
        }
        const review = await this.prisma.review.create({
            data: {
                bookingId,
                travelerId,
                tripTemplateId: booking.session.template.id,
                rating: dto.rating,
                comment: dto.comment,
                isVerifiedBooking: true,
            },
        });
        await this.updateTripRating(booking.session.template.id);
        return review;
    }
    async getReviewsByTrip(tripId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { tripTemplateId: tripId },
                include: { traveler: { select: { id: true, name: true, avatar: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.review.count({
                where: { tripTemplateId: tripId },
            }),
        ]);
        return {
            reviews,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    async getReviewStats(tripId) {
        const reviews = await this.prisma.review.findMany({
            where: { tripTemplateId: tripId },
            select: { rating: true },
        });
        if (reviews.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                distribution: {
                    1: 0,
                    2: 0,
                    3: 0,
                    4: 0,
                    5: 0,
                },
            };
        }
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        reviews.forEach((review) => {
            sum += review.rating;
            distribution[review.rating]++;
        });
        return {
            averageRating: Math.round((sum / reviews.length) * 10) / 10,
            totalReviews: reviews.length,
            distribution,
        };
    }
    async respondToReview(reviewId, agencyId, dto) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            include: { booking: { include: { session: { include: { template: true } } } } },
        });
        if (!review) {
            throw new common_1.BadRequestException('Review not found');
        }
        if (review.booking.session.template.agencyId !== agencyId) {
            throw new common_1.ForbiddenException('Not authorized to respond to this review');
        }
        const updatedReview = await this.prisma.review.update({
            where: { id: reviewId },
            data: { response: dto.response },
        });
        return updatedReview;
    }
    async updateReview(reviewId, travelerId, dto) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            include: { booking: { include: { session: { include: { template: true } } } } },
        });
        if (!review) {
            throw new common_1.BadRequestException('Review not found');
        }
        if (review.travelerId !== travelerId) {
            throw new common_1.ForbiddenException('Not authorized to update this review');
        }
        const updatedReview = await this.prisma.review.update({
            where: { id: reviewId },
            data: {
                rating: dto.rating ?? review.rating,
                comment: dto.comment ?? review.comment,
            },
        });
        await this.updateTripRating(review.booking.session.template.id);
        return updatedReview;
    }
    async deleteReview(reviewId, userId, userRole) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            include: { booking: { include: { session: { include: { template: true } } } } },
        });
        if (!review) {
            throw new common_1.BadRequestException('Review not found');
        }
        if (review.travelerId !== userId &&
            userRole !== 'ADMIN') {
            throw new common_1.ForbiddenException('Not authorized to delete this review');
        }
        await this.prisma.review.delete({
            where: { id: reviewId },
        });
        await this.updateTripRating(review.booking.session.template.id);
    }
    async moderateReview(reviewId, action) {
        return this.prisma.review.findUnique({
            where: { id: reviewId },
        });
    }
    async updateTripRating(tripId) {
        const stats = await this.getReviewStats(tripId);
        await this.prisma.tripTemplate.update({
            where: { id: tripId },
            data: {
                averageRating: stats.averageRating,
                reviewCount: stats.totalReviews,
                lastReviewDate: new Date(),
            },
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map