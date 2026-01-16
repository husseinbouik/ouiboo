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
exports.CreateTripSessionDto = exports.UpdateTripTemplateDto = exports.CreateTripTemplateDto = exports.ItineraryDayDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const types_1 = require("@ouiboo/types");
class ItineraryDayDto {
}
exports.ItineraryDayDto = ItineraryDayDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], ItineraryDayDto.prototype, "dayNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Arrival in Marrakech' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ItineraryDayDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'We will pick you up from the airport...' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ItineraryDayDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['Airport transfer', 'Welcome dinner'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ItineraryDayDto.prototype, "activities", void 0);
class CreateTripTemplateDto {
}
exports.CreateTripTemplateDto = CreateTripTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Marrakech Desert Adventure' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateTripTemplateDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Experience the magic of the Moroccan desert...' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    __metadata("design:type", String)
], CreateTripTemplateDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: types_1.TripCategory, example: types_1.TripCategory.Adventure }),
    (0, class_validator_1.IsEnum)(types_1.TripCategory),
    __metadata("design:type", String)
], CreateTripTemplateDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Marrakech, Morocco' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTripTemplateDto.prototype, "startLocation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateTripTemplateDto.prototype, "durationDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTripTemplateDto.prototype, "durationNights", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['Transport', 'Lunch', 'Guide'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTripTemplateDto.prototype, "inclusions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['Safari Nature', 'Kayak'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTripTemplateDto.prototype, "exclusions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['Hiking shoes', 'Backpack'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTripTemplateDto.prototype, "checklist", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['https://example.com/image1.jpg'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTripTemplateDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: types_1.TripStatus, example: types_1.TripStatus.Draft }),
    (0, class_validator_1.IsEnum)(types_1.TripStatus),
    __metadata("design:type", String)
], CreateTripTemplateDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ItineraryDayDto], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ItineraryDayDto),
    __metadata("design:type", Array)
], CreateTripTemplateDto.prototype, "itinerary", void 0);
class UpdateTripTemplateDto extends (0, swagger_1.PartialType)(CreateTripTemplateDto) {
}
exports.UpdateTripTemplateDto = UpdateTripTemplateDto;
class CreateTripSessionDto {
}
exports.CreateTripSessionDto = CreateTripSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-01T00:00:00Z' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTripSessionDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-05T00:00:00Z' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTripSessionDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1200.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateTripSessionDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500.00 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTripSessionDto.prototype, "deposit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 20 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateTripSessionDto.prototype, "totalSeats", void 0);
//# sourceMappingURL=create-trip.dto.js.map