import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MoneyInput, toMoneyDecimal, toMoneyString } from '../common/money.util';
import { Prisma, TransactionType } from '@ouiboo/database';
import { randomUUID } from 'node:crypto';

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
        return this.db.$transaction((tx) => this.creditWalletInTransaction(
            tx,
            tenantId,
            amount,
            reason,
        ));
    }

    async creditWalletInTransaction(
        tx: Prisma.TransactionClient,
        tenantId: string,
        amount: MoneyInput,
        reason: string,
        options: {
            idempotencyKey?: string;
            referenceId?: string;
            type?: TransactionType;
        } = {},
    ) {
        const decimalAmount = toMoneyDecimal(amount);
        const wallet = await tx.wallet.upsert({
            where: { agencyId: tenantId },
            update: {},
            create: { agencyId: tenantId, availableBalance: 0, pendingBalance: 0 },
        });

        if (options.idempotencyKey) {
            const transactionType = options.type ?? TransactionType.CREDIT;
            const inserted = await tx.$executeRaw`
                INSERT INTO "WalletTransaction"
                    ("id", "walletId", "amount", "type", "reason", "referenceId", "idempotencyKey", "createdAt")
                VALUES
                    (${randomUUID()}, ${wallet.id}, ${decimalAmount}, ${transactionType}::"TransactionType", ${reason}, ${options.referenceId ?? null}, ${options.idempotencyKey}, CURRENT_TIMESTAMP)
                ON CONFLICT ("idempotencyKey") DO NOTHING
            `;
            if (inserted === 0) {
                return wallet;
            }
        } else {
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: decimalAmount,
                    type: options.type ?? TransactionType.CREDIT,
                    reason,
                    referenceId: options.referenceId,
                },
            });
        }

        return tx.wallet.update({
            where: { id: wallet.id },
            data: { availableBalance: { increment: decimalAmount } },
        });
    }

    async requestPayout(tenantId: string, amount: MoneyInput, bankDetails: string) {
        const decimalAmount = toMoneyDecimal(amount);
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: tenantId },
            select: {
                verificationStatus: true,
                subscriptionStatus: true,
                trialEndsAt: true,
                subscriptionEndsAt: true,
                bankDetails: true,
                rib: true,
            },
        });
        if (!agency || agency.verificationStatus !== 'VERIFIED') {
            throw new ForbiddenException('AGENCY_VERIFICATION_REQUIRED');
        }
        const now = new Date();
        const subscriptionValid = agency.subscriptionStatus === 'ACTIVE'
            ? !agency.subscriptionEndsAt || agency.subscriptionEndsAt > now
            : agency.subscriptionStatus === 'TRIAL' && !!agency.trialEndsAt && agency.trialEndsAt > now;
        if (!subscriptionValid) {
            throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
        }
        const verifiedBankDetails = (agency.bankDetails || agency.rib || '').trim();
        if (!verifiedBankDetails || verifiedBankDetails.startsWith('PENDING')) {
            throw new BadRequestException('Verified bank details are required');
        }
        if (bankDetails.trim() !== verifiedBankDetails) {
            throw new BadRequestException('Payout bank details must match the verified agency profile');
        }

        return this.db.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { agencyId: tenantId } });
            if (!wallet || wallet.availableBalance.lt(decimalAmount)) {
                throw new BadRequestException('Insufficient balance');
            }

            const reserved = await tx.wallet.updateMany({
                where: {
                    agencyId: tenantId,
                    availableBalance: { gte: decimalAmount },
                },
                data: { availableBalance: { decrement: decimalAmount } }
            });
            if (reserved.count !== 1) {
                throw new BadRequestException('Insufficient balance');
            }

            const request = await tx.payoutRequest.create({
                data: {
                    agencyId: tenantId,
                    amount: decimalAmount,
                    bankDetails: verifiedBankDetails,
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
