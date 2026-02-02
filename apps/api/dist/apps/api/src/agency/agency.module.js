"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgencyModule = void 0;
const common_1 = require("@nestjs/common");
const agency_controller_1 = require("./agency.controller");
const database_module_1 = require("../database/database.module");
const wallets_module_1 = require("../wallets/wallets.module");
const agency_public_controller_1 = require("./agency-public.controller");
let AgencyModule = class AgencyModule {
};
exports.AgencyModule = AgencyModule;
exports.AgencyModule = AgencyModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, wallets_module_1.WalletsModule],
        controllers: [agency_controller_1.AgencyController, agency_public_controller_1.AgencyPublicController],
    })
], AgencyModule);
//# sourceMappingURL=agency.module.js.map