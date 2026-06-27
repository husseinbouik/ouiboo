import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MoneyInput, toMoneyDecimal, toMoneyString } from '../common/money.util';

@Injectable()
export class WalletsService {
    constructor(private db: DatabaseService) { }

    async getWallet(tenantId: string) {
        const wallet = await this.db.wallet.findUnique({
            where: { agencyId: tenantId },
            include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }
        });

        if (!wallet) {
            return null;
        }

        return {
            ...wallet,
            availableBalance: toMoneyString(wallet.availableBalance) || '0.00',
            pendingBalance: toMoneyString(wallet.pendingBalance) || '0.00',
            transactions: wallet.transactions.map((transaction) => ({
                ...transaction,
                amount: toMoneyString(transaction.amount) || '0.00',
            })),
        };
    }

    async creditWallet(tenantId: string, amount: MoneyInput, reason: string) {
        const decimalAmount = toMoneyDecimal(amount);
        return this.db.$transaction(async (tx) => {
            const wallet = await tx.wallet.upsert({
                where: { agencyId: tenantId },
                update: { availableBalance: { increment: decimalAmount } },
                create: { agencyId: tenantId, availableBalance: decimalAmount, pendingBalance: 0 }
            });

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: decimalAmount,
                    type: 'CREDIT',
                    reason
                }
            });

            return wallet;
        });
    }

    async requestPayout(tenantId: string, amount: MoneyInput, bankDetails: string) {
        const decimalAmount = toMoneyDecimal(amount);
        return this.db.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { agencyId: tenantId } });
            if (!wallet || wallet.availableBalance.lt(decimalAmount)) {
                throw new Error('Insufficient balance');
            }

            await tx.wallet.update({
                where: { agencyId: tenantId },
                data: { availableBalance: { decrement: decimalAmount } }
            });

            const request = await tx.payoutRequest.create({
                data: {
                    agencyId: tenantId,
                    amount: decimalAmount,
                    bankDetails,
                    status: 'PENDING'
                }
            });

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: decimalAmount.neg(),
                    type: 'DEBIT',
                    reason: `Payout request #${request.id}`
                }
            });

            return request;
        });
    }
}
