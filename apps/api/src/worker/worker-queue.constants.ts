export const MAINTENANCE_QUEUE = 'maintenance';

export const MaintenanceJobName = {
  PaymentProofReminders: 'payment-proof-reminders',
  TripReminders7Days: 'trip-reminders-7-days',
  TripReminders1Day: 'trip-reminders-1-day',
  AutoCancelUnpaidBookings: 'auto-cancel-unpaid-bookings',
  ExchangeRateRefresh: 'exchange-rate-refresh',
} as const;
