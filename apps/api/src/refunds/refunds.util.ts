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
    [RefundCaseStatus.REFUND_COMPLETED]: [],
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
    const adminReview = evidence.find(
        (e) =>
            e.tier === RefundEvidenceTier.ADMIN_REVIEW
            && e.source === RefundEvidenceSource.ADMIN,
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
