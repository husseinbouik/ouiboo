/**
 * #438 (Council P1-12): retention configuration — the adopted
 * retention schedule (goal workspace:
 * files/legal/retention-schedule-DRAFT.md, ADOPTED as the working rule
 * by the founder 2026-10-28, pending counsel confirmation at the CNDP
 * session) translated into enforceable periods.
 *
 * Categories WITH a defined period in the adopted schedule — enforced
 * by RetentionService:
 * - audit logs: 3 years (the admin prune endpoint stays env-driven
 *   and untouched; this cron path uses the schedule default)
 * - search-event analytics: 13 months rolling
 * - messages + attachments: 2 years after the thread's last message
 * - payment proofs: 2 years after the booking's refund/dispute
 *   window closes
 * - refund case evidence: 2 years after case closure
 * - server/application logs: 90 days — the DB-resident application
 *   logs are NotificationLog (mail bodies included) and the processed
 *   WebhookInboxEntry rows; infrastructure logs live in the log drain,
 *   not in this database.
 * - expired session/OTP/reset material: expiry-driven, no period —
 *   expired RefreshToken rows are deleted and expired OTP / password
 *   reset fields on User are cleared.
 *
 * Categories the schedule leaves COUNSEL TO CONFIRM — deliberately
 * NOT purged by any job here (listed on #438 as the remainder):
 * - booking records (5 years after completion, "counsel to confirm
 *   against Moroccan fiscal retention duties")
 * - agency verification dossiers (relationship duration + 1 year —
 *   no relationship-end timestamp exists in the schema yet)
 * - invoices, credit notes and the payment ledger (fiscal archive;
 *   no period in the schedule)
 * - the legal-hold exception itself is an open counsel question; the
 *   purge audit trail (AuditLog action RETENTION_PURGE) is what a
 *   future hold mechanism will key on.
 *
 * Every period is env-overridable so a counsel amendment lands as
 * configuration, not a code change.
 */

export interface RetentionConfig {
    auditLogDays: number;
    searchEventMonths: number;
    notificationLogDays: number;
    webhookInboxDays: number;
    messageMonths: number;
    paymentProofMonths: number;
    refundEvidenceMonths: number;
    batchSize: number;
}

function envInt(name: string, fallback: number, env: NodeJS.ProcessEnv): number {
    const raw = Number(env[name]);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

export function getRetentionConfig(env: NodeJS.ProcessEnv = process.env): RetentionConfig {
    return {
        auditLogDays: envInt('RETENTION_AUDIT_LOG_DAYS', 3 * 365, env),
        searchEventMonths: envInt('RETENTION_SEARCH_EVENT_MONTHS', 13, env),
        notificationLogDays: envInt('RETENTION_NOTIFICATION_LOG_DAYS', 90, env),
        webhookInboxDays: envInt('RETENTION_WEBHOOK_INBOX_DAYS', 90, env),
        messageMonths: envInt('RETENTION_MESSAGE_MONTHS', 24, env),
        paymentProofMonths: envInt('RETENTION_PAYMENT_PROOF_MONTHS', 24, env),
        refundEvidenceMonths: envInt('RETENTION_REFUND_EVIDENCE_MONTHS', 24, env),
        batchSize: Math.min(envInt('RETENTION_BATCH_SIZE', 500, env), 5000),
    };
}

/** Subtract whole calendar months in UTC, clamping the day of month. */
export function monthsAgo(now: Date, months: number): Date {
    const result = new Date(now.getTime());
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() - months);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
}

export function daysAgo(now: Date, days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
