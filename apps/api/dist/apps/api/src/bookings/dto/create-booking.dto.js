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
exports.CreateBookingDto = exports.PaymentMethodEnum = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var PaymentMethodEnum;
(function (PaymentMethodEnum) {
    PaymentMethodEnum["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethodEnum["CARD"] = "CARD";
    PaymentMethodEnum["WALLET"] = "WALLET";
    PaymentMethodEnum["MOBILE_MONEY"] = "MOBILE_MONEY";
})(PaymentMethodEnum || (exports.PaymentMethodEnum = PaymentMethodEnum = {}));
class CreateBookingDto {
}
exports.CreateBookingDto = CreateBookingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'clxpcyz12000008l2h3j4k5l6' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateBookingDto.prototype, "guestsCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Abderrahmane El Amrani' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+212612345678' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CIN AE123456' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PaymentMethodEnum, example: PaymentMethodEnum.BANK_TRANSFER, description: 'Preferred payment method' }),
    (0, class_validator_1.IsEnum)(PaymentMethodEnum),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "paymentMethod", void 0);
//# sourceMappingURL=create-booking.dto.js.map