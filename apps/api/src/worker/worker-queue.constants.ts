export const MAINTENANCE_QUEUE = 'maintenance';

export const MaintenanceJobName = {
  PaymentProofReminders: 'payment-proof-reminders',
  TripReminders7Days: 'trip-reminders-7-days',
  TripReminders1Day: 'trip-reminders-1-day',
  AutoCancelUnpaidBookings: 'auto-cancel-unpaid-bookings',
  ExchangeRateRefresh: 'exchange-rate-refresh',
  CompleteFinishedBookings: 'complete-finished-bookings',
  GroupConfirmationDeadlines: 'group-confirmation-deadlines',
  // #433: the refund-due sweeps join the hourly deadline cadence (they
  // previously only ran inside the daily serverless maintenance pass).
  RefundDueCaseSync: 'refund-due-case-sync',
  RefundOverdueSweep: 'refund-overdue-sweep',
} as const;
