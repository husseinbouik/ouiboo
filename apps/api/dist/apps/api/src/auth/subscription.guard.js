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
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let SubscriptionGuard = class SubscriptionGuard {
    constructor(db) {
        this.db = db;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || user.role !== 'AGENCY') {
            return true;
        }
        const agency = await this.db.agencyProfile.findUnique({
            where: { userId: user.userId },
            select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true }
        });
        if (!agency)
            return false;
        if (agency.subscriptionStatus === 'ACTIVE') {
            const now = new Date();
            if (agency.subscriptionEndsAt && now > agency.subscriptionEndsAt) {
                throw new common_1.ForbiddenException({
                    message: 'SUBSCRIPTION_EXPIRED',
                    details: 'Your subscription has ended. Please renew to continue.'
                });
            }
            return true;
        }
        if (agency.subscriptionStatus === 'TRIAL') {
            const now = new Date();
            if (agency.trialEndsAt && now > agency.trialEndsAt) {
                throw new common_1.ForbiddenException({
                    message: 'TRIAL_EXPIRED',
                    details: 'Your free trial has expired. Please upgrade to continue.'
                });
            }
            return true;
        }
        throw new common_1.ForbiddenException('SUBSCRIPTION_REQUIRED');
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map