import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WalletsService {
    constructor(private db: DatabaseService) { }

    async getWallet(tenantId: string) {
        return this.db.wallet.findUnique({
            where: { agencyId: tenantId },
            include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }
        });
    }

    async creditWallet(tenantId: string, amount: number, reason: string) {
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

    async requestPayout(tenantId: string, amount: number, bankDetails: string) {
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
}
