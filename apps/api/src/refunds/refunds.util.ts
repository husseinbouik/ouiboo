import {
    PaymentLedgerSource,
    RefundCaseStatus,
    RefundEvidenceSource,
    RefundEvidenceTier,
} from '@ouiboo/database';
import { REFUND_POLICY_VERSION } from '../staged-payments/staged-payments.util';

export { REFUND_POLICY_VERSION };

/**
 * #370 — RefundCase lifecycle rules (plan §§13–16).
 *
 * A RefundCase tracks money the AGENCY (or its payment provider) owes a
 * traveller. OuiBoo never holds traveller money in Phase 1, so a case is
 * an obligation record with a measurable SLA — not a balance, and never a
 * "refund guaranteed by OuiBoo".
 */

/** Machine-readable case triggers stored in RefundCase.reason. */
export const REFUND_REASON_GROUP_MINIMUM_NOT_REACHED = 'GROUP_MINIMUM_NOT_REACHED';
export const REFUND_REASON_TRAVELLER_REQUEST = 'TRAVELLER_REQUEST';
export const REFUND_REASON_TRAVELLER_CANCELLATION = 'TRAVELLER_CANCELLATION';
export const REFUND_REASON_AGENCY_CANCELLATION = 'AGENCY_CANCELLATION';
export const REFUND_REASON_ADMIN_INITIATED = 'ADMIN_INITIATED';

/** Eligibility rule applied to automatic minimum-group refund-due cases. */
export const REFUND_RULE_MINIMUM_NOT_REACHED =
    'MINIMUM_GROUP_NOT_REACHED_DEPOSIT_REFUNDABLE';

/** Actor id written to audit rows / createdBy for system-driven changes. */
export const REFUND_SYSTEM_ACTOR = 'SYSTEM';

/** Restriction reason stored on AgencyProfile while a refund is overdue. */
export const REFUND_RESTRICTION_REASON = 'OVERDUE_REFUND';

/**
 * Agency SLA: once a refund is approved (or automatically due), the agency
 * must initiate it within this many days. Configurable via
 * REFUND_AGENCY_ACTION_DAYS; defaults to 7 calendar days. Measurable by
 * the system through RefundCase.refundDueAt.
 */
export function refundAgencyActionDays(): number {
    const raw = Number(process.env.REFUND_AGENCY_ACTION_DAYS);
    if (Number.isFinite(raw) && raw >= 1 && raw <= 90) {
        return Math.floor(raw);
    }
    return 7;
}

export function refundDueDate(from: Date): Date {
    const due = new Date(from);
    due.setUTCDate(due.getUTCDate() + refundAgencyActionDays());
    return due;
}

/** Statuses in which a case still needs work (not terminal). */
export const REFUND_ACTIVE_STATUSES: RefundCaseStatus[] = [
    RefundCaseStatus.REFUND_REQUESTED,
    RefundCaseStatus.ELIGIBILITY_REVIEW,
    RefundCaseStatus.REFUND_APPROVED,
    RefundCaseStatus.AGENCY_ACTION_REQUIRED,
    RefundCaseStatus.REFUND_INITIATED,
    RefundCaseStatus.REFUND_FAILED,
    RefundCaseStatus.REFUND_OVERDUE,
];

/** Statuses that count as "the agency must act" for dashboards/banners. */
export const REFUND_AGENCY_ACTION_STATUSES: RefundCaseStatus[] = [
    RefundCaseStatus.AGENCY_ACTION_REQUIRED,
    RefundCaseStatus.REFUND_OVERDUE,
];

/**
 * Allowed transitions (plan §13 core chain plus alternatives). REFUND_APPROVED
 * is recorded as an audited step on the way to AGENCY_ACTION_REQUIRED: the
 * approval decision and the agency notification happen in one use-case, but
 * both states exist in the audit trail.
 */
export const REFUND_TRANSITIONS: Record<RefundCaseStatus, RefundCaseStatus[]> = {
    [RefundCaseStatus.REFUND_REQUESTED]: [
        RefundCaseStatus.ELIGIBILITY_REVIEW,
        RefundCaseStatus.REFUND_REJECTED,
    ],
    [RefundCaseStatus.ELIGIBILITY_REVIEW]: [
        RefundCaseStatus.REFUND_APPROVED,
        RefundCaseStatus.REFUND_REJECTED,
    ],
    [RefundCaseStatus.REFUND_APPROVED]: [
        RefundCaseStatus.AGENCY_ACTION_REQUIRED,
    ],
    [RefundCaseStatus.AGENCY_ACTION_REQUIRED]: [
        RefundCaseStatus.REFUND_INITIATED,
        RefundCaseStatus.REFUND_OVERDUE,
        RefundCaseStatus.REFUND_FAILED,
    ],
    [RefundCaseStatus.REFUND_INITIATED]: [
        RefundCaseStatus.REFUND_COMPLETED,
        RefundCaseStatus.REFUND_FAILED,
    ],
    [RefundCaseStatus.REFUND_FAILED]: [
        // A failed refund never disappears: the agency can retry the
        // initiation, and the overdue sweep can resurface it.
        RefundCaseStatus.REFUND_INITIATED,
        RefundCaseStatus.REFUND_OVERDUE,
    ],
    [RefundCaseStatus.REFUND_OVERDUE]: [
        RefundCaseStatus.REFUND_INITIATED,
        RefundCaseStatus.REFUND_FAILED,
    ],
    // #416B (Council P0-09): the single exit from REFUND_COMPLETED in the
    // public state machine is the traveller dispute path
    // (RefundsService.disputeReceipt — the case's own traveller, within
    // the dispute window, money fields reverted). RefundsService.beginReview
    // explicitly refuses completed cases so no other actor can use this
    // edge; admin corrections of completed cases remain on the #423
    // repair path, which bypasses this map deliberately.
    [RefundCaseStatus.REFUND_COMPLETED]: [RefundCaseStatus.ELIGIBILITY_REVIEW],
    [RefundCaseStatus.REFUND_REJECTED]: [],
};

export function canTransitionRefund(
    from: RefundCaseStatus,
    to: RefundCaseStatus,
): boolean {
    return (REFUND_TRANSITIONS[from] ?? []).includes(to);
}

/** Statuses the overdue sweep acts on once refundDueAt has passed. */
export const REFUND_OVERDUE_ELIGIBLE_STATUSES: RefundCaseStatus[] = [
    RefundCaseStatus.REFUND_APPROVED,
    RefundCaseStatus.AGENCY_ACTION_REQUIRED,
    RefundCaseStatus.REFUND_FAILED,
];

/**
 * #416 (Council P0-09): the completion gate. A refund case may complete
 * only on a qualifying evidence set (strongest first):
 *   tier 1 PSP_CONFIRMATION            — provider/webhook confirmation
 *   tier 2 BANK_PROVIDER_CONFIRMATION  — bank/provider confirmation doc
 *   tier 3 BANK_REFERENCE              — bank reference AND retained proof
 *   tier 5 ADMIN_REVIEW                — an admin's recorded review
 *     (B8: only when the review row carries a written reason AND an
 *     attached document or external reference — see below)
 *   tier 4 TRAVELLER_CONFIRMATION + tier 5 — corroborated completion
 * Tier 4 alone NEVER qualifies: the traveller's word corroborates, it
 * does not certify the agency's refund. Returns the qualifying tier, the
 * honest ledger source for it (provenance derives from the evidence —
 * never from a typed provider string), and the qualifying row's
 * reference, or null when no set qualifies.
 */
export interface RefundEvidenceLike {
    tier: RefundEvidenceTier;
    source?: RefundEvidenceSource | string | null;
    reference?: string | null;
    proofUrl?: string | null;
    note?: string | null;
}

export interface RefundCompletionQualification {
    tier: RefundEvidenceTier;
    source: PaymentLedgerSource;
    reference: string | null;
}

export function qualifyingRefundCompletion(
    evidence: RefundEvidenceLike[],
): RefundCompletionQualification | null {
    const psp = evidence.find((e) => e.tier === RefundEvidenceTier.PSP_CONFIRMATION);
    if (psp) {
        return {
            tier: RefundEvidenceTier.PSP_CONFIRMATION,
            source: PaymentLedgerSource.GATEWAY_REFUND,
            reference: psp.reference ?? null,
        };
    }
    const bankProvider = evidence.find(
        (e) => e.tier === RefundEvidenceTier.BANK_PROVIDER_CONFIRMATION,
    );
    if (bankProvider) {
        return {
            tier: RefundEvidenceTier.BANK_PROVIDER_CONFIRMATION,
            source: PaymentLedgerSource.BANK_CONFIRMATION,
            reference: bankProvider.reference ?? null,
        };
    }
    const bankReference = evidence.find(
        (e) =>
            e.tier === RefundEvidenceTier.BANK_REFERENCE
            && typeof e.reference === 'string'
            && e.reference.trim() !== ''
            && typeof e.proofUrl === 'string'
            && e.proofUrl.trim() !== '',
    );
    if (bankReference) {
        return {
            tier: RefundEvidenceTier.BANK_REFERENCE,
            source: PaymentLedgerSource.BANK_CONFIRMATION,
            reference: bankReference.reference ?? null,
        };
    }
    // Tier 5 (B8, Council Session #2): an admin review qualifies only
    // when it was recorded as a real review — a mandatory written reason
    // (the row's note) AND an attached document or an external
    // reference. Rows lacking either (notably the legacy rows the old
    // completion-time auto-create wrote with neither) NEVER qualify:
    // there is no grandfathering.
    const adminReview = evidence.find(
        (e) =>
            e.tier === RefundEvidenceTier.ADMIN_REVIEW
            && e.source === RefundEvidenceSource.ADMIN
            && typeof e.note === 'string'
            && e.note.trim() !== ''
            && ((typeof e.reference === 'string' && e.reference.trim() !== '')
                || (typeof e.proofUrl === 'string' && e.proofUrl.trim() !== '')),
    );
    if (adminReview) {
        return {
            tier: RefundEvidenceTier.ADMIN_REVIEW,
            source: PaymentLedgerSource.ADMIN_PROOF_REVIEW,
            reference: adminReview.reference ?? null,
        };
    }
    return null;
}

/**
 * #416B (Council P0-09, plan D7): how long after completion the case's
 * traveller may dispute receipt and reopen the case. Working default —
 * founder-adjustable.
 */
export const REFUND_DISPUTE_WINDOW_DAYS = 60;

/**
 * #416B (Council P0-09, plan §2.5 / D6): risk-based audit flags stamped
 * at completion time. A completion is queued for admin audit when any
 * hard signal holds — the case was ever REFUND_OVERDUE, it was disputed
 * (reopened) before, the amount is at or above the threshold, or the
 * completion relied on the weakest qualifying evidence path (tier 3
 * BANK_REFERENCE, or tier 5 ADMIN_REVIEW — B8: always flagged) — plus
 * a deterministic sample of all other completions. The threshold is a named constant on purpose: it is a
 * founder-adjustable policy value, applied to the case amount (the
 * beta's cases are MAD).
 */
export const REFUND_AUDIT_AMOUNT_THRESHOLD_MAD = 5000;

/** 1-in-N deterministic sampling: N = 5 yields a ≥20% sample. */
export const REFUND_AUDIT_SAMPLE_MODULO = 5;

/**
 * Deterministic per-case sampling (stable across runs and workers —
 * no randomness at completion time, so retries agree).
 */
export function refundAuditSampled(caseId: string): boolean {
    let hash = 0;
    for (let i = 0; i < caseId.length; i++) {
        hash = (hash * 31 + caseId.charCodeAt(i)) % 2147483647;
    }
    return hash % REFUND_AUDIT_SAMPLE_MODULO === 0;
}

export interface RefundAuditSignals {
    wasEverOverdue: boolean;
    wasDisputed: boolean;
    amountAtOrAboveThreshold: boolean;
    completionTier: RefundEvidenceTier;
    travellerConfirmationPresent: boolean;
    caseId: string;
}

export function refundAuditRequired(signals: RefundAuditSignals): boolean {
    if (signals.wasEverOverdue || signals.wasDisputed || signals.amountAtOrAboveThreshold) {
        return true;
    }
    // Weakest qualifying paths: tier 3 carries the refund on a bank
    // reference + retained proof alone.
    if (signals.completionTier === RefundEvidenceTier.BANK_REFERENCE) {
        return true;
    }
    // B8 (Council Session #2): EVERY tier-5 completion is audited. An
    // admin review is the platform certifying a refund on its own word,
    // so it is always queued for audit — regardless of traveller
    // confirmation, amount, or overdue state (a tier-5 completion with
    // no traveller confirmation previously fell through to the ~20%
    // sample, and the audit queue is worked by the same solo admin).
    if (signals.completionTier === RefundEvidenceTier.ADMIN_REVIEW) {
        return true;
    }
    return refundAuditSampled(signals.caseId);
}
