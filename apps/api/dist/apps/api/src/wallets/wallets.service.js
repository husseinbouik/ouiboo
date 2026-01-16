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
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let WalletsService = class WalletsService {
    constructor(db) {
        this.db = db;
    }
    async getWallet(tenantId) {
        return this.db.wallet.findUnique({
            where: { agencyId: tenantId },
            include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }
        });
    }
    async creditWallet(tenantId, amount, reason) {
        return this.db.$transaction(async (tx) => {
            const wallet = await tx.wallet.upsert({
                where: { agencyId: tenantId },
                update: { availableBalance: { increment: amount } },
                create: { agencyId: tenantId, availableBalance: amount, pendingBalance: 0 }
            });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount,
                    type: 'CREDIT',
                    reason
                }
            });
            return wallet;
        });
    }
    async requestPayout(tenantId, amount, bankDetails) {
        return this.db.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { agencyId: tenantId } });
            if (!wallet || wallet.availableBalance < amount) {
                throw new Error('Insufficient balance');
            }
            await tx.wallet.update({
                where: { agencyId: tenantId },
                data: { availableBalance: { decrement: amount } }
            });
            const request = await tx.payoutRequest.create({
                data: {
                    agencyId: tenantId,
                    amount,
                    bankDetails,
                    status: 'PENDING'
                }
            });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: -amount,
                    type: 'DEBIT',
                    reason: `Payout request #${request.id}`
                }
            });
            return request;
        });
    }
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map