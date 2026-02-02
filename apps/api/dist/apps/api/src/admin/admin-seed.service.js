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
var AdminSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSeedService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const types_1 = require("@ouiboo/types");
const bcrypt = require("bcrypt");
let AdminSeedService = AdminSeedService_1 = class AdminSeedService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(AdminSeedService_1.name);
    }
    async onModuleInit() {
        if (process.env.ADMIN_SEED === 'false') {
            return;
        }
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin';
        const email = process.env.ADMIN_EMAIL || `${username}@ouiboo.local`;
        const rotateOnBoot = process.env.ADMIN_SEED_ROTATE === 'true';
        const hasPasswordOverride = typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length > 0;
        const shouldRotatePassword = rotateOnBoot && hasPasswordOverride;
        if (rotateOnBoot && !hasPasswordOverride) {
            this.logger.warn('ADMIN_SEED_ROTATE is true but ADMIN_PASSWORD is not set; skipping password rotation.');
        }
        const existing = await this.db.user.findUnique({ where: { email } });
        if (existing) {
            const updateData = {};
            if (!existing.isEmailVerified) {
                updateData.isEmailVerified = true;
            }
            if (existing.role !== types_1.UserRole.Admin) {
                updateData.role = types_1.UserRole.Admin;
            }
            if (username && existing.name !== username) {
                updateData.name = username;
            }
            if (shouldRotatePassword) {
                updateData.password = await bcrypt.hash(password, 10);
            }
            if (Object.keys(updateData).length > 0) {
                await this.db.user.update({
                    where: { email },
                    data: updateData,
                });
                this.logger.log(`Updated admin user for ${email}.${shouldRotatePassword ? ' Password rotated.' : ''}`);
            }
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.db.user.create({
            data: {
                name: username,
                email,
                password: hashedPassword,
                role: types_1.UserRole.Admin,
                isEmailVerified: true,
            },
        });
        this.logger.log(`Seeded admin user ${email}.`);
    }
};
exports.AdminSeedService = AdminSeedService;
exports.AdminSeedService = AdminSeedService = AdminSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AdminSeedService);
//# sourceMappingURL=admin-seed.service.js.map