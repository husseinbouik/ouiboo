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
exports.AdminAnalyticsController = exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getRevenueTrends(startDate, endDate, period = 'daily', req) {
        return this.analyticsService.getRevenueTrends(req.user.agencyId, new Date(startDate), new Date(endDate), period);
    }
    async getConversionFunnel(startDate, endDate, req) {
        return this.analyticsService.getConversionFunnel(req.user.agencyId, new Date(startDate), new Date(endDate));
    }
    async getTopTrips(limit = '10', req) {
        return this.analyticsService.getTopTrips(req.user.agencyId, parseInt(limit));
    }
    async getPaymentMethods(req) {
        return this.analyticsService.getPaymentMethodDistribution(req.user.agencyId);
    }
    async getCustomerDemographics(req) {
        return this.analyticsService.getCustomerDemographics(req.user.agencyId);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('revenue-trends'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('period')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getRevenueTrends", null);
__decorate([
    (0, common_1.Get)('conversion-funnel'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getConversionFunnel", null);
__decorate([
    (0, common_1.Get)('top-trips'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTopTrips", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Get)('customer-demographics'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getCustomerDemographics", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
let AdminAnalyticsController = class AdminAnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getPlatformMetrics() {
        return this.analyticsService.getPlatformMetrics();
    }
};
exports.AdminAnalyticsController = AdminAnalyticsController;
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "getPlatformMetrics", null);
exports.AdminAnalyticsController = AdminAnalyticsController = __decorate([
    (0, common_1.Controller)('admin/analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AdminAnalyticsController);
//# sourceMappingURL=analytics.controller.js.map