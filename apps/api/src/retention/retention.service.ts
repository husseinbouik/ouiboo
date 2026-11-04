import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UploadService } from '../upload/upload.service';
import {
    daysAgo,
    getRetentionConfig,
    monthsAgo,
    RetentionConfig,
} from './retention-config';

export interface CategoryResult {
    /** Rows that matched the purge rule (in dry-run: would be deleted). */
    matched: number;
    /** Rows actually deleted (always 0 in dry-run). */
    deleted: number;
    /** Storage objects deleted for file categories. */
    storageDeleted: number;
    /** Rows skipped because their storage object could not be deleted. */
    storageFailed: number;
    /** True when the category itself failed (isolated from the rest). */
    failed?: boolean;
}

export interface RetentionReport {
    dryRun: boolean;
    ranAt: string;
    categories: Record<string, CategoryResult>;
    totals: CategoryResult;
}

const emptyResult = (): CategoryResult => ({ matched: 0, deleted: 0, storageDeleted: 0, storageFailed: 0 });

/**
 * #438 (Council P1-12): retention enforcement for the categories whose
 * periods the ADOPTED schedule defines (see retention-config.ts for
 * the category-by-category mapping and the counsel-held remainder,
 * which this service deliberately never touches).
 *
 * Guarantees:
 * - Batched deletes (config.batchSize) — never an unbounded delete.
 * - File categories delete the storage object FIRST; a row whose
 *   object cannot be deleted is skipped this run (counted in
 *   storageFailed) so a purge never orphans a live file silently.
 * - dryRun computes the same counts and deletes nothing.
 * - Every real run writes ONE AuditLog row (action RETENTION_PURGE)
 *   carrying the structured per-category counts — the purge audit
 *   trail the schedule's enforcement section asks for.
 * - Idempotent and safe to retry: a second run matches nothing the
 *   first run already removed.
 */
@Injectable()
export class RetentionService {
    private readonly logger = new Logger(RetentionService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly uploadService: UploadService,
    ) {}

    async runRetention(options: { dryRun?: boolean; now?: Date } = {}): Promise<RetentionReport> {
        const config = getRetentionConfig();
        const now = options.now ?? new Date();
        const dryRun = options.dryRun === true;
        const categories: Record<string, CategoryResult> = {};

        const run = async (name: string, fn: () => Promise<CategoryResult>) => {
            try {
                categories[name] = await fn();
            } catch (error) {
                // Isolate per-category failures: one failing category
                // must not block the rest of the schedule.
                this.logger.error(`Retention category ${name} failed`, error);
                categories[name] = { ...emptyResult(), failed: true };
            }
        };

        await run('auditLogs', () => this.purgeSimple('auditLog', { createdAt: { lt: daysAgo(now, config.auditLogDays) } }, config, dryRun));
        await run('searchEvents', () => this.purgeSimple('searchEvent', { createdAt: { lt: monthsAgo(now, config.searchEventMonths) } }, config, dryRun));
        await run('notificationLogs', () => this.purgeSimple('notificationLog', { sentAt: { lt: daysAgo(now, config.notificationLogDays) } }, config, dryRun));
        await run('webhookInbox', () =>
            this.purgeSimple(
                'webhookInboxEntry',
                {
                    receivedAt: { lt: daysAgo(now, config.webhookInboxDays) },
                    // Never purge an entry that has not finished
                    // processing — RECEIVED rows are still in flight.
                    processingStatus: { in: ['PROCESSED', 'DUPLICATE', 'REJECTED', 'MISMATCH', 'FAILED'] },
                },
                config,
                dryRun,
            ),
        );
        await run('expiredAuthMaterial', () => this.purgeExpiredAuthMaterial(now, config, dryRun));
        await run('messages', () => this.purgeMessages(now, config, dryRun));
        await run('paymentProofs', () => this.purgePaymentProofs(now, config, dryRun));
        await run('refundEvidence', () => this.purgeRefundEvidence(now, config, dryRun));

        const totals = Object.values(categories).reduce<CategoryResult>(
            (sum, r) => ({
                matched: sum.matched + r.matched,
                deleted: sum.deleted + r.deleted,
                storageDeleted: sum.storageDeleted + r.storageDeleted,
                storageFailed: sum.storageFailed + r.storageFailed,
            }),
            emptyResult(),
        );

        const report: RetentionReport = { dryRun, ranAt: now.toISOString(), categories, totals };
        this.logger.log(`[RETENTION] ${JSON.stringify(report)}`);
        if (!dryRun) {
            // The purge audit trail. Written AFTER the purge (the row
            // itself is 3-year audit data, never a purge target of the
            // same run).
            await this.db.auditLog
                .create({
                    data: {
                        action: 'RETENTION_PURGE',
                        targetType: 'Retention',
                        metadata: JSON.parse(JSON.stringify(report)) as object,
                    },
                })
                .catch((error: unknown) => this.logger.error('Retention audit write failed', error));
        }
        return report;
    }

    /** Batched id-based purge for the simple date-cutoff categories. */
    private async purgeSimple(
        model: 'auditLog' | 'searchEvent' | 'notificationLog' | 'webhookInboxEntry',
        where: Record<string, unknown>,
        config: RetentionConfig,
        dryRun: boolean,
    ): Promise<CategoryResult> {
        const delegate = this.db[model] as unknown as {
            count: (args: { where: Record<string, unknown> }) => Promise<number>;
            findMany: (args: { where: Record<string, unknown>; select: { id: true }; take: number }) => Promise<Array<{ id: string }>>;
            deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<{ count: number }>;
        };
        const result = emptyResult();
        result.matched = await delegate.count({ where });
        if (dryRun) return result;
        while (result.deleted < result.matched) {
            const rows = await delegate.findMany({ where, select: { id: true }, take: config.batchSize });
            if (rows.length === 0) break;
            const deleted = await delegate.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
            result.deleted += deleted.count;
            if (deleted.count === 0) break;
        }
        return result;
    }

    /**
     * Expired session/OTP/reset material (expiry-driven, no period):
     * expired RefreshToken rows are deleted; expired OTP and password
     * reset fields on User are cleared in place (the account stays).
     */
    private async purgeExpiredAuthMaterial(now: Date, config: RetentionConfig, dryRun: boolean): Promise<CategoryResult> {
        const result = emptyResult();
        const [expiredTokens, expiredOtps, expiredResets] = await Promise.all([
            this.db.refreshToken.count({ where: { expiresAt: { lt: now } } }),
            this.db.user.count({ where: { otp: { not: null }, otpExpiresAt: { lt: now } } }),
            this.db.user.count({
                where: { passwordResetTokenHash: { not: null }, passwordResetExpiresAt: { lt: now } },
            }),
        ]);
        result.matched = expiredTokens + expiredOtps + expiredResets;
        if (dryRun) return result;

        while (true) {
            const rows = await this.db.refreshToken.findMany({
                where: { expiresAt: { lt: now } },
                select: { id: true },
                take: config.batchSize,
            });
            if (rows.length === 0) break;
            const deleted = await this.db.refreshToken.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
            result.deleted += deleted.count;
            if (deleted.count === 0) break;
        }
        const otpCleared = await this.db.user.updateMany({
            where: { otp: { not: null }, otpExpiresAt: { lt: now } },
            data: { otp: null, otpExpiresAt: null, otpLastSentAt: null },
        });
        const resetsCleared = await this.db.user.updateMany({
            where: { passwordResetTokenHash: { not: null }, passwordResetExpiresAt: { lt: now } },
            data: { passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetSentAt: null },
        });
        result.deleted += otpCleared.count + resetsCleared.count;
        return result;
    }

    /**
     * Messages + attachments: 2 years after the thread's last message.
     * The whole conversation goes (its messages cascade), with every
     * attachment object deleted from storage first.
     */
    private async purgeMessages(now: Date, config: RetentionConfig, dryRun: boolean): Promise<CategoryResult> {
        const cutoff = monthsAgo(now, config.messageMonths);
        const result = emptyResult();
        const where = {
            OR: [
                { lastMessageAt: { lt: cutoff } },
                { lastMessageAt: null, createdAt: { lt: cutoff } },
            ],
        };
        result.matched = await this.db.conversation.count({ where });
        if (dryRun) return result;
        while (true) {
            const conversations = await this.db.conversation.findMany({
                where,
                select: { id: true },
                take: config.batchSize,
            });
            if (conversations.length === 0) break;
            let progressed = false;
            for (const conversation of conversations) {
                const attachments = await this.db.message.findMany({
                    where: { conversationId: conversation.id, attachmentUrl: { not: null } },
                    select: { attachmentUrl: true },
                });
                let storageOk = true;
                for (const message of attachments) {
                    const ok = await this.deleteStorageObject(message.attachmentUrl, result);
                    if (!ok) storageOk = false;
                }
                if (!storageOk) continue;
                await this.db.conversation.delete({ where: { id: conversation.id } });
                result.deleted += 1;
                progressed = true;
            }
            if (!progressed) break;
        }
        return result;
    }

    /**
     * Payment proofs: 2 years after the booking's refund/dispute
     * window closes. The window anchor is the latest closed refund
     * case's completion (updatedAt for rejected cases) or, when no
     * case ever opened, the session end date. A booking with an OPEN
     * refund case is never purged. The proof object is deleted from
     * storage and the legacy Booking.paymentProofUrl pointer cleared.
     */
    private async purgePaymentProofs(now: Date, config: RetentionConfig, dryRun: boolean): Promise<CategoryResult> {
        const cutoff = monthsAgo(now, config.paymentProofMonths);
        const result = emptyResult();
        const candidates = await this.db.paymentProof.findMany({
            where: { uploadedAt: { lt: cutoff } },
            select: {
                id: true,
                imageUrl: true,
                bookingId: true,
                booking: {
                    select: {
                        status: true,
                        paymentProofUrl: true,
                        session: { select: { endDate: true } },
                        refundCases: {
                            select: { status: true, completedAt: true, updatedAt: true },
                        },
                    },
                },
            },
            take: 5000,
        });
        const eligible = candidates.filter((proof) => {
            const booking = proof.booking;
            if (!booking) return false;
            if (!['COMPLETED', 'CANCELLED', 'NO_SHOW', 'NOT_CONFIRMED', 'REJECTED'].includes(booking.status)) return false;
            const cases = booking.refundCases ?? [];
            if (cases.some((c) => !['REFUND_COMPLETED', 'REFUND_REJECTED'].includes(c.status))) return false;
            const anchors = cases.map((c) => c.completedAt ?? c.updatedAt).filter((d): d is Date => !!d);
            anchors.push(booking.session.endDate);
            const windowClosedAt = new Date(Math.max(...anchors.map((d) => d.getTime())));
            return windowClosedAt < cutoff;
        });
        result.matched = eligible.length;
        if (dryRun) return result;
        for (const proof of eligible.slice(0, config.batchSize * 10)) {
            const ok = await this.deleteStorageObject(proof.imageUrl, result);
            if (!ok) continue;
            await this.db.paymentProof.delete({ where: { id: proof.id } });
            result.deleted += 1;
            if (proof.booking?.paymentProofUrl && proof.booking.paymentProofUrl === proof.imageUrl) {
                await this.db.booking.update({
                    where: { id: proof.bookingId },
                    data: { paymentProofUrl: null },
                });
            }
        }
        return result;
    }

    /**
     * Refund case evidence: 2 years after case closure. Only the
     * evidence rows (and their stored files) go — the case itself is
     * the financial record and stays.
     */
    private async purgeRefundEvidence(now: Date, config: RetentionConfig, dryRun: boolean): Promise<CategoryResult> {
        const cutoff = monthsAgo(now, config.refundEvidenceMonths);
        const result = emptyResult();
        const candidates = await this.db.refundEvidence.findMany({
            where: {
                refundCase: {
                    status: { in: ['REFUND_COMPLETED', 'REFUND_REJECTED'] },
                },
            },
            select: {
                id: true,
                proofUrl: true,
                refundCase: { select: { completedAt: true, updatedAt: true } },
            },
            take: 5000,
        });
        const eligible = candidates.filter((evidence) => {
            const closedAt = evidence.refundCase.completedAt ?? evidence.refundCase.updatedAt;
            return closedAt < cutoff;
        });
        result.matched = eligible.length;
        if (dryRun) return result;
        for (const evidence of eligible.slice(0, config.batchSize * 10)) {
            if (evidence.proofUrl) {
                const ok = await this.deleteStorageObject(evidence.proofUrl, result);
                if (!ok) continue;
            }
            await this.db.refundEvidence.delete({ where: { id: evidence.id } });
            result.deleted += 1;
        }
        return result;
    }

    /**
     * Delete one storage object by stored reference. Non-platform
     * references are a no-op success (nothing of ours to delete);
     * platform deletion failures are counted and reported so the row
     * is skipped, never orphaned silently.
     */
    private async deleteStorageObject(reference: string | null | undefined, result: CategoryResult): Promise<boolean> {
        if (!reference) return true;
        try {
            const deleted = await this.uploadService.deleteFileByReference(reference);
            if (deleted) result.storageDeleted += 1;
            return true;
        } catch (error) {
            this.logger.error(`Retention storage deletion failed for a reference`, error);
            result.storageFailed += 1;
            return false;
        }
    }
}
