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
exports.UpdateAgencyProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateAgencyProfileDto {
}
exports.UpdateAgencyProfileDto = UpdateAgencyProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Atlas Voyages' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], UpdateAgencyProfileDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456789012345' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(15),
    __metadata("design:type", String)
], UpdateAgencyProfileDto.prototype, "ice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'P1234567' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAgencyProfileDto.prototype, "patente", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MA6400010001000100010001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(24),
    __metadata("design:type", String)
], UpdateAgencyProfileDto.prototype, "rib", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Expert travel agency in Morocco...', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAgencyProfileDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://example.com/logo.png', required: false }),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAgencyProfileDto.prototype, "logo", void 0);
//# sourceMappingURL=update-profile.dto.js.map