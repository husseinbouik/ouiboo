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
exports.WishlistController = void 0;
const common_1 = require("@nestjs/common");
const wishlist_service_1 = require("./wishlist.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let WishlistController = class WishlistController {
    constructor(wishlistService) {
        this.wishlistService = wishlistService;
    }
    async addToWishlist(tripId, req) {
        return this.wishlistService.addToWishlist(req.user.id, tripId);
    }
    async removeFromWishlist(tripId, req) {
        return this.wishlistService.removeFromWishlist(req.user.id, tripId);
    }
    async getWishlist(page = '1', limit = '20', req) {
        return this.wishlistService.getUserWishlist(req.user.id, parseInt(page), parseInt(limit));
    }
    async isInWishlist(tripId, req) {
        const isWishlisted = await this.wishlistService.isInWishlist(req.user.id, tripId);
        return { isWishlisted };
    }
    async getCount(req) {
        const count = await this.wishlistService.getWishlistCount(req.user.id);
        return { count };
    }
};
exports.WishlistController = WishlistController;
__decorate([
    (0, common_1.Post)(':tripId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('tripId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Delete)(':tripId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('tripId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "removeFromWishlist", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Get)(':tripId/is-wishlisted'),
    __param(0, (0, common_1.Param)('tripId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "isInWishlist", null);
__decorate([
    (0, common_1.Get)('count'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "getCount", null);
exports.WishlistController = WishlistController = __decorate([
    (0, common_1.Controller)('users/wishlist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [wishlist_service_1.WishlistService])
], WishlistController);
//# sourceMappingURL=wishlist.controller.js.map