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
exports.SendNotificationDto = exports.NotificationPreferenceDto = void 0;
const class_validator_1 = require("class-validator");
class NotificationPreferenceDto {
}
exports.NotificationPreferenceDto = NotificationPreferenceDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "paymentReminder", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "tripReminder", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "bookingConfirmation", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "cancellationAlert", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "reviewRequest", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "smsNotifications", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "emailNotifications", void 0);
class SendNotificationDto {
}
exports.SendNotificationDto = SendNotificationDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "recipientEmail", void 0);
//# sourceMappingURL=notification-preference.dto.js.map