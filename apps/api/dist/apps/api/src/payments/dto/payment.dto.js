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
exports.ProcessRefundDto = exports.VerifyPaymentDto = exports.InitiatePaymentDto = void 0;
const class_validator_1 = require("class-validator");
class InitiatePaymentDto {
}
exports.InitiatePaymentDto = InitiatePaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], InitiatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "travelerEmail", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "travelerName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['CMI', 'STRIPE', 'CASHPLUS']),
    __metadata("design:type", String)
], InitiatePaymentDto.prototype, "provider", void 0);
class VerifyPaymentDto {
}
exports.VerifyPaymentDto = VerifyPaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "transactionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['CMI', 'STRIPE', 'CASHPLUS']),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "provider", void 0);
class ProcessRefundDto {
}
exports.ProcessRefundDto = ProcessRefundDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessRefundDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessRefundDto.prototype, "transactionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ProcessRefundDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['CMI', 'STRIPE', 'CASHPLUS']),
    __metadata("design:type", String)
], ProcessRefundDto.prototype, "provider", void 0);
//# sourceMappingURL=payment.dto.js.map