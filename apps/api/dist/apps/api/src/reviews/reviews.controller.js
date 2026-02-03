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
exports.ReviewDetailController = exports.TripsReviewsController = exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const reviews_service_1 = require("./reviews.service");
const create_review_dto_1 = require("./dto/create-review.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ReviewsController = class ReviewsController {
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async createReview(bookingId, dto, req) {
        return this.reviewsService.createReview(bookingId, req.user.id, dto);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Post)(':bookingId/review'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_review_dto_1.CreateReviewDto, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createReview", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, common_1.Controller)('bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
let TripsReviewsController = class TripsReviewsController {
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async getReviews(tripId, page = '1', limit = '10') {
        return this.reviewsService.getReviewsByTrip(tripId, parseInt(page), parseInt(limit));
    }
    async getReviewStats(tripId) {
        return this.reviewsService.getReviewStats(tripId);
    }
};
exports.TripsReviewsController = TripsReviewsController;
__decorate([
    (0, common_1.Get)(':tripId/reviews'),
    __param(0, (0, common_1.Param)('tripId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TripsReviewsController.prototype, "getReviews", null);
__decorate([
    (0, common_1.Get)(':tripId/reviews/stats'),
    __param(0, (0, common_1.Param)('tripId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TripsReviewsController.prototype, "getReviewStats", null);
exports.TripsReviewsController = TripsReviewsController = __decorate([
    (0, common_1.Controller)('trips'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], TripsReviewsController);
let ReviewDetailController = class ReviewDetailController {
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async respondToReview(reviewId, dto, req) {
        return this.reviewsService.respondToReview(reviewId, req.user.agencyId, dto);
    }
    async updateReview(reviewId, dto, req) {
        return this.reviewsService.updateReview(reviewId, req.user.id, dto);
    }
    async deleteReview(reviewId, req) {
        return this.reviewsService.deleteReview(reviewId, req.user.id, req.user.role);
    }
};
exports.ReviewDetailController = ReviewDetailController;
__decorate([
    (0, common_1.Post)(':reviewId/response'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_review_dto_1.ReviewResponseDto, Object]),
    __metadata("design:returntype", Promise)
], ReviewDetailController.prototype, "respondToReview", null);
__decorate([
    (0, common_1.Patch)(':reviewId'),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_review_dto_1.UpdateReviewDto, Object]),
    __metadata("design:returntype", Promise)
], ReviewDetailController.prototype, "updateReview", null);
__decorate([
    (0, common_1.Delete)(':reviewId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewDetailController.prototype, "deleteReview", null);
exports.ReviewDetailController = ReviewDetailController = __decorate([
    (0, common_1.Controller)('reviews'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewDetailController);
//# sourceMappingURL=reviews.controller.js.map