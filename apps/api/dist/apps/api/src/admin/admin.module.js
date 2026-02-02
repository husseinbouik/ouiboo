"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_seed_service_1 = require("./admin-seed.service");
const audit_log_service_1 = require("./audit-log.service");
const database_module_1 = require("../database/database.module");
const wallets_module_1 = require("../wallets/wallets.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, wallets_module_1.WalletsModule],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_seed_service_1.AdminSeedService, audit_log_service_1.AuditLogService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map