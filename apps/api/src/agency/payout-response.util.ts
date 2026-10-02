import { type PayoutDetails, type PayoutStatusType } from '@ouiboo/types';
import { type MoneyInput, toMoneyString } from '../common/money.util';

type NullableDate = Date | string | null | undefined;

type PayoutMapperInput = {
  id: string;
  agencyId: string;
  amount: MoneyInput;
  status: string;
  requestedAt: Date | string;
  processedAt?: NullableDate;
  bankDetails: string;
  agency?: {
    id: string;
    companyName: string;
    user?: {
      email?: string | null;
    } | null;
  } | null;
};

const toIsoString = (value: NullableDate) => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

export const mapPayoutDetails = (payout: PayoutMapperInput): PayoutDetails => ({
  id: payout.id,
  agencyId: payout.agencyId,
  amount: toMoneyString(payout.amount) || '0.00',
  status: payout.status as PayoutStatusType,
  requestedAt: toIsoString(payout.requestedAt) || new Date(0).toISOString(),
  processedAt: toIsoString(payout.processedAt),
  bankDetails: payout.bankDetails,
  agency: {
    id: payout.agency?.id || payout.agencyId,
    companyName: payout.agency?.companyName || '',
    user: payout.agency?.user
      ? {
          email: payout.agency.user.email,
        }
      : null,
  },
});
