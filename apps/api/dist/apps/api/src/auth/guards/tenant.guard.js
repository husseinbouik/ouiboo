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
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@ouiboo/types");
const database_service_1 = require("../../database/database.service");
let TenantGuard = class TenantGuard {
    constructor(db) {
        this.db = db;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user || user.role !== types_1.UserRole.Agency) {
            return true;
        }
        if (user.tenantId) {
            req.tenantId = user.tenantId;
            return true;
        }
        if (!user.userId) {
            throw new common_1.UnauthorizedException('Missing user identifier');
        }
        const agencyProfile = await this.db.agencyProfile.findUnique({
            where: { userId: user.userId },
        });
        if (!agencyProfile) {
            throw new common_1.UnauthorizedException('Agency profile not found');
        }
        req.tenantId = agencyProfile.id;
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map