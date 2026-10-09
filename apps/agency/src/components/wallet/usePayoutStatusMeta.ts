import { useTranslation } from 'react-i18next';
import { PayoutStatus } from '@ouiboo/types';

export function usePayoutStatusMeta() {
  const { t } = useTranslation();

  const getPayoutStatusMeta = (status: PayoutStatus) => {
    if (status === PayoutStatus.Paid) {
      return {
        className: 'bg-success/10 text-success shadow-sm',
        description: t('wallet.payoutStatus.paid'),
      };
    }

    if (status === PayoutStatus.Rejected) {
      return {
        className: 'bg-danger/10 text-danger shadow-sm',
        description: t('wallet.payoutStatus.rejected'),
      };
    }

    if (status === PayoutStatus.Approved) {
      return {
        className: 'bg-primary/10 text-primary shadow-sm',
        description: t('wallet.payoutStatus.approved'),
      };
    }

    return {
      className: 'bg-warning/10 text-warning shadow-sm',
      description: t('wallet.payoutStatus.pending'),
    };
  };

  const getPayoutStatusLabel = (status: PayoutStatus) => {
    if (status === PayoutStatus.Paid) return t('status.payoutPaid');
    if (status === PayoutStatus.Approved) return t('status.payoutApproved');
    if (status === PayoutStatus.Rejected) return t('status.payoutRejected');
    return t('status.payoutPending');
  };

  return { getPayoutStatusMeta, getPayoutStatusLabel };
}
