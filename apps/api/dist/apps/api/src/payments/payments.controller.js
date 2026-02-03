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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const payment_dto_1 = require("./dto/payment.dto");
let PaymentsController = PaymentsController_1 = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
        this.logger = new common_1.Logger(PaymentsController_1.name);
    }
    async initiatePayment(dto) {
        return this.paymentsService.initiatePayment(dto);
    }
    async verifyPayment(dto) {
        return this.paymentsService.verifyPayment(dto);
    }
    async processRefund(dto) {
        return this.paymentsService.processRefund(dto);
    }
    async handleWebhook(provider, req, headers) {
        const payload = (req.rawBody || '').toString();
        let signature;
        if (provider.toLowerCase() === 'stripe') {
            signature = headers['stripe-signature'];
        }
        else if (provider.toLowerCase() === 'cmi') {
            signature = headers['x-signature'] || headers['x-cmi-signature'];
        }
        else if (provider.toLowerCase() === 'cashplus') {
            signature = headers['x-signature'] || headers['x-cashplus-signature'];
        }
        else {
            signature = headers['x-signature'];
        }
        if (!signature) {
            this.logger.warn(`Missing signature header for webhook provider: ${provider}`);
            throw new Error(`Missing signature header for provider: ${provider}`);
        }
        this.logger.log(`Webhook received from provider: ${provider}`);
        return this.paymentsService.handleWebhookCallback(provider, payload, signature);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('initiate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.InitiatePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.VerifyPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.ProcessRefundDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "processRefund", null);
__decorate([
    (0, common_1.Post)('webhook/:provider'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
exports.PaymentsController = PaymentsController = PaymentsController_1 = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map