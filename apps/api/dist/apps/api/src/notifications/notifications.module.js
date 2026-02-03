"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const database_module_1 = require("../database/database.module");
const email_module_1 = require("../email/email.module");
const notifications_service_1 = require("./notifications.service");
const notification_jobs_service_1 = require("./notification-jobs.service");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, schedule_1.ScheduleModule.forRoot(), email_module_1.EmailModule],
        providers: [notifications_service_1.NotificationsService, notification_jobs_service_1.NotificationJobsService],
        exports: [notifications_service_1.NotificationsService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map