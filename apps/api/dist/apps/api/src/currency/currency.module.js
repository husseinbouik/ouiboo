"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const database_module_1 = require("../database/database.module");
const currency_service_1 = require("./currency.service");
const currency_controller_1 = require("./currency.controller");
let CurrencyModule = class CurrencyModule {
};
exports.CurrencyModule = CurrencyModule;
exports.CurrencyModule = CurrencyModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, schedule_1.ScheduleModule.forRoot()],
        providers: [currency_service_1.CurrencyService],
        controllers: [currency_controller_1.CurrencyController],
        exports: [currency_service_1.CurrencyService],
    })
], CurrencyModule);
//# sourceMappingURL=currency.module.js.map