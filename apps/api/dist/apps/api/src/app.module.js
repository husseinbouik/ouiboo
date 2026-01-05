"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const auth_module_1 = require("./auth/auth.module");
const trips_module_1 = require("./trips/trips.module");
const users_module_1 = require("./users/users.module");
const database_module_1 = require("./database/database.module");
const upload_module_1 = require("./upload/upload.module");
const bookings_module_1 = require("./bookings/bookings.module");
const agency_module_1 = require("./agency/agency.module");
const admin_module_1 = require("./admin/admin.module");
const wallets_module_1 = require("./wallets/wallets.module");
const email_module_1 = require("./email/email.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
            }),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            trips_module_1.TripsModule,
            users_module_1.UsersModule,
            upload_module_1.UploadModule,
            bookings_module_1.BookingsModule,
            agency_module_1.AgencyModule,
            admin_module_1.AdminModule,
            wallets_module_1.WalletsModule,
            email_module_1.EmailModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map