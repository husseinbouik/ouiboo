import { UnauthorizedException } from '@nestjs/common';
import { CronController } from './cron.controller';

/**
 * #433 (Council P1-07): the deadline jobs run hourly via POST /cron/deadlines,
 * failures are isolated per job, and failures / newly-overdue refunds emit
 * the [CRON ALERT] call site (#399 owns delivery proof).
 */
describe('CronController deadlines (#433)', () => {
  const SECRET = 'test-cron-secret';
  let controller: CronController;
  let services: any;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    delete process.env.ALERT_WEBHOOK_URL;
    services = {
      notificationJobs: {
        sendPaymentProofReminders: jest.fn(async () => undefined),
        autoCancelUnpaidBookings: jest.fn(async () => undefined),
        sendTripReminders7DaysBefore: jest.fn(async () => undefined),
        sendTripReminders1DayBefore: jest.fn(async () => undefined),
        completeFinishedBookings: jest.fn(async () => undefined),
        sendSubscriptionRenewalReminders: jest.fn(async () => undefined),
      },
      currencyService: { updateExchangeRates: jest.fn(async () => undefined) },
      stagedPaymentsService: {
        evaluateConfirmationDeadlines: jest.fn(async () => ({ confirmed: 0, notConfirmed: 0 })),
        expirePayLaterHolds: jest.fn(async () => ({ evaluated: 0, released: 0 })),
      },
      refundsService: {
        syncRefundDueCases: jest.fn(async () => ({ created: 0 })),
        markOverdueCases: jest.fn(async () => ({ marked: 0 })),
      },
      paymentReconciliationService: { runReconciliation: jest.fn(async () => undefined) },
      agencyComplianceService: { sweepExpiredLicencesAndInsurance: jest.fn(async () => undefined) },
    };
    controller = new CronController(
      services.notificationJobs,
      services.currencyService,
      services.stagedPaymentsService,
      services.refundsService,
      services.paymentReconciliationService,
      services.agencyComplianceService,
    );
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }) as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.CRON_SECRET;
  });

  it('rejects a missing/invalid cron secret', async () => {
    await expect(controller.runDeadlines(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.runDeadlines('Bearer wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(services.stagedPaymentsService.evaluateConfirmationDeadlines).not.toHaveBeenCalled();
  });

  it('runs exactly the deadline jobs', async () => {
    const res = await controller.runDeadlines(`Bearer ${SECRET}`);
    expect(res.results).toEqual({
      groupConfirmationDeadlines: 'ok',
      payLaterHoldExpiry: 'ok',
      refundDueCaseSync: 'ok',
      refundOverdueSweep: 'ok',
    });
    expect(services.stagedPaymentsService.evaluateConfirmationDeadlines).toHaveBeenCalledTimes(1);
    expect(services.refundsService.syncRefundDueCases).toHaveBeenCalledTimes(1);
    expect(services.refundsService.markOverdueCases).toHaveBeenCalledTimes(1);
    // Non-deadline maintenance jobs do NOT run on the hourly endpoint.
    expect(services.currencyService.updateExchangeRates).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('isolates a failing job and emits the alert call site (webhook when configured)', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    services.refundsService.syncRefundDueCases.mockRejectedValue(new Error('db down'));
    const res = await controller.runDeadlines(`Bearer ${SECRET}`);
    expect(res.results.groupConfirmationDeadlines).toBe('ok');
    expect(res.results.refundDueCaseSync).toBe('failed');
    expect(res.results.refundOverdueSweep).toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ source: 'ouiboo-cron' });
  });

  it('alerts when the overdue sweep newly marks refunds overdue', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    services.refundsService.markOverdueCases.mockResolvedValue({ marked: 2 });
    await controller.runDeadlines(`Bearer ${SECRET}`);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body).alert).toContain('REFUND_OVERDUE');
  });

  it('daily maintenance still runs the deadline jobs as a backstop', async () => {
    const res = await controller.runMaintenance(`Bearer ${SECRET}`);
    expect(res.results.groupConfirmationDeadlines).toBe('ok');
    expect(res.results.refundDueCaseSync).toBe('ok');
    expect(res.results.refundOverdueSweep).toBe('ok');
    expect(res.results.exchangeRateRefresh).toBe('ok');
  });
});
