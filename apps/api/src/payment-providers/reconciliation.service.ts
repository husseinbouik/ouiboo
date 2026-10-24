import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
    PaymentAttemptStatus,
    PaymentReconciliationMismatchType,
    PaymentReconciliationStatus,
    Prisma,
} from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { decimalEqualsMoney } from '../common/money.util';

/**
 * #373 — lightweight payment reconciliation (plan §51).
 *
 * Compares OuiBoo's PaymentAttempt records against the provider's own
 * reported status (via the adapter) and turns disagreements into
 * PaymentReconciliationMismatch alert records. It NEVER mutates payment
 * state to match a provider report — a human resolves mismatches, and
 * resolution is recorded on the alert itself.
 *
 * Scheduled-invocation point: the cron maintenance job calls
 * runReconciliation(); admins can also trigger it on demand.
 */
@Injectable()
export class PaymentReconciliationService {
    private readonly logger = new Logger(PaymentReconciliationService.name);

    constructor(
        private db: DatabaseService,
        private registry: PspAdapterRegistry,
    ) { }

    async runReconciliation(limit = 100) {
        const attempts = await this.db.paymentAttempt.findMany({
            where: {
                status: {
                    in: [
                        PaymentAttemptStatus.PENDING,
                        PaymentAttemptStatus.CAPTURED,
                        PaymentAttemptStatus.FAILED,
                    ],
                },
            },
            include: { paymentProfile: true },
            orderBy: { createdAt: 'asc' },
            take: Math.min(500, Math.max(1, limit)),
        });

        let checked = 0;
        let mismatchesCreated = 0;
        for (const attempt of attempts) {
            checked += 1;
            try {
                const created = await this.reconcileAttempt(attempt);
                mismatchesCreated += created;
            } catch (error) {
                this.logger.warn(
                    `Reconciliation failed for attempt ${attempt.id}: ${(error as Error).message}`,
                );
            }
        }
        return { checked, mismatchesCreated };
    }

    private async reconcileAttempt(attempt: any): Promise<number> {
        const adapter = this.registry.get(attempt.provider);
        const remote = await adapter.fetchPaymentStatus(
            {
                agencyId: attempt.agencyId,
                externalMerchantId: attempt.paymentProfile.externalMerchantId,
                currency: attempt.paymentProfile.currency,
            },
            {
                providerPaymentId: attempt.providerPaymentId,
                bookingId: attempt.bookingId,
                stage: attempt.stage,
            },
        );

        let created = 0;
        if (remote.merchantId !== attempt.paymentProfile.externalMerchantId) {
            created += await this.openMismatch(attempt, {
                type: PaymentReconciliationMismatchType.MERCHANT_MISMATCH,
                reason: `Provider reports merchant "${remote.merchantId}" for a payment belonging to "${attempt.paymentProfile.externalMerchantId}"`,
                providerStatus: remote.status,
            });
        }
        if (!decimalEqualsMoney(remote.amount, attempt.amount) && remote.status !== 'pending') {
            created += await this.openMismatch(attempt, {
                type: PaymentReconciliationMismatchType.AMOUNT_MISMATCH,
                reason: `Provider amount ${remote.amount} differs from the attempt amount ${attempt.amount.toString()}`,
                providerStatus: remote.status,
            });
        }
        if (remote.status === 'captured' && attempt.status !== PaymentAttemptStatus.CAPTURED) {
            created += await this.openMismatch(attempt, {
                type: PaymentReconciliationMismatchType.MISSING_WEBHOOK,
                reason: 'Provider reports the payment as captured but OuiBoo has not applied a capture for it',
                providerStatus: remote.status,
            });
        } else if (
            (remote.status === 'failed' && attempt.status === PaymentAttemptStatus.CAPTURED)
            || (remote.status === 'captured' && attempt.status === PaymentAttemptStatus.FAILED)
            || (remote.status === 'refunded' && attempt.status === PaymentAttemptStatus.CAPTURED)
        ) {
            created += await this.openMismatch(attempt, {
                type: PaymentReconciliationMismatchType.STATUS_MISMATCH,
                reason: `Provider status "${remote.status}" disagrees with the recorded attempt status "${attempt.status}"`,
                providerStatus: remote.status,
            });
        }
        return created;
    }

    /** Create an OPEN mismatch unless an identical one is already open. */
    private async openMismatch(
        attempt: any,
        mismatch: { type: PaymentReconciliationMismatchType; reason: string; providerStatus: string },
    ): Promise<number> {
        const existing = await this.db.paymentReconciliationMismatch.findFirst({
            where: {
                paymentAttemptId: attempt.id,
                type: mismatch.type,
                status: PaymentReconciliationStatus.OPEN,
            },
        });
        if (existing) {
            return 0;
        }
        await this.db.paymentReconciliationMismatch.create({
            data: {
                provider: attempt.provider,
                type: mismatch.type,
                agencyId: attempt.agencyId,
                bookingId: attempt.bookingId,
                paymentAttemptId: attempt.id,
                externalPaymentId: attempt.externalPaymentId ?? null,
                details: {
                    reason: mismatch.reason,
                    providerStatus: mismatch.providerStatus,
                    source: 'reconciliation',
                } as Prisma.InputJsonValue,
            },
        });
        return 1;
    }

    async listMismatches(page = 1, limit = 20, status?: PaymentReconciliationStatus) {
        const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
        const safePage = Math.max(1, Math.floor(page) || 1);
        const where = status ? { status } : {};
        const [rows, total] = await Promise.all([
            this.db.paymentReconciliationMismatch.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.paymentReconciliationMismatch.count({ where }),
        ]);
        return {
            data: rows,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            },
        };
    }

    async resolveMismatch(id: string) {
        const mismatch = await this.db.paymentReconciliationMismatch.findUnique({ where: { id } });
        if (!mismatch) {
            throw new NotFoundException('Reconciliation mismatch not found');
        }
        return this.db.paymentReconciliationMismatch.update({
            where: { id },
            data: { status: PaymentReconciliationStatus.RESOLVED, resolvedAt: new Date() },
        });
    }
}
