/**
 * #786 (Council S6 Phase 3, smallest useful slice): shared types and
 * label mapping for the agency CRM area (contacts + booking pipeline).
 * The data comes from GET /agency/crm/contacts and
 * GET /agency/crm/pipeline — both derived server-side from the
 * agency's own bookings only.
 */

export interface CrmContact {
  travelerId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  bookingCount: number;
  tripCount: number;
  lastBookingDate: string;
  totalBookedValue: string;
  currency: string;
}

export interface CrmPipelineStage {
  status: string;
  count: number;
  totalAmount: string;
  currency: string;
}

export interface CrmPipeline {
  stages: CrmPipelineStage[];
  totals: { bookings: number; bookedValue: string; currency: string };
  refundCases: { open: number; total: number };
}

/** i18n key for each pipeline stage, reusing the shared status labels. */
export const CRM_STAGE_LABEL_KEYS: Record<string, string> = {
  PENDING: 'status.bookingPending',
  AWAITING_VALIDATION: 'status.bookingAwaitingValidation',
  PENDING_MINIMUM: 'crm.statusPendingMinimum',
  CONFIRMED: 'status.bookingConfirmed',
  COMPLETED: 'status.bookingCompleted',
  NOT_CONFIRMED: 'crm.statusNotConfirmed',
  CANCELLED: 'status.bookingCancelled',
  REJECTED: 'status.bookingRejected',
  NO_SHOW: 'status.bookingNoShow',
};

export const crmStageLabelKey = (status: string): string =>
  CRM_STAGE_LABEL_KEYS[status] ?? status;
