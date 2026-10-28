import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationJobsService } from '../notifications/notification-jobs.service';
import { CurrencyService } from '../currency/currency.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { PaymentReconciliationService } from '../payment-providers/reconciliation.service';
import { AgencyComplianceService } from '../agency/agency-compliance.service';

/**
 * Serverless-compatible cron endpoint (#216).
 *
 * Background jobs (BullMQ workers) do not run reliably on Vercel serverless.
 * Per ROADMAP.md, maintenance jobs moved to Vercel Cron, which invokes this
 * endpoint on a schedule. The job logic runs synchronously within the request
 * (no Redis/BullMQ required).
 *
 * Security: protected by CRON_SECRET. Vercel Cron sends it as an
 * Authorization header. Fails closed if not configured.
 */
@ApiTags('Cron')
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly notificationJobs: NotificationJobsService,
    private readonly currencyService: CurrencyService,
    private readonly stagedPaymentsService: StagedPaymentsService,
    private readonly refundsService: RefundsService,
    private readonly paymentReconciliationService: PaymentReconciliationService,
    private readonly agencyComplianceService: AgencyComplianceService,
  ) {}

  private validateCronSecret(authorization?: string): void {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Cron not configured');
    }
    // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
    if (authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }

  @Post('maintenance')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Run scheduled maintenance jobs (Vercel Cron)',
    description:
      'Executes payment reminders, booking auto-cancel, trip reminders, ' +
      'exchange rate refresh, and finished-booking completion. ' +
      'Intended to be called by Vercel Cron, not by users.',
  })
  @ApiResponse({ status: 200, description: 'Maintenance jobs completed' })
  @ApiResponse({ status: 401, description: 'Invalid or missing cron secret' })
  async runMaintenance(@Headers('authorization') authorization?: string) {
    this.validateCronSecret(authorization);

    const results: Record<string, string> = {};
    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        results[name] = 'ok';
      } catch (error) {
        // Isolate per-job failures: one failing job must not block the rest.
        // (AGENTS.md: batch jobs must isolate per-recipient failures and be idempotent.)
        this.logger.error(`Maintenance job ${name} failed`, error);
        results[name] = 'failed';
      }
    };

    // Mirror the BullMQ schedule from maintenance-scheduler.service.ts.
    // Vercel Cron invokes this endpoint; frequency is configured in vercel.json.
    await run('paymentProofReminders', () =>
      this.notificationJobs.sendPaymentProofReminders(),
    );
    await run('autoCancelUnpaidBookings', () =>
      this.notificationJobs.autoCancelUnpaidBookings(),
    );
    await run('tripReminders7Days', () =>
      this.notificationJobs.sendTripReminders7DaysBefore(),
    );
    await run('tripReminders1Day', () =>
      this.notificationJobs.sendTripReminders1DayBefore(),
    );
    await run('exchangeRateRefresh', () =>
      this.currencyService.updateExchangeRates(),
    );
    await run('completeFinishedBookings', () =>
      this.notificationJobs.completeFinishedBookings(),
    );
    await run('subscriptionRenewalReminders', () =>
      this.notificationJobs.sendSubscriptionRenewalReminders(),
    );
    // #369/#370 deadline jobs — shared with the hourly endpoint below.
    Object.assign(results, await this.runDeadlineJobs());
    // #373: compare provider-reported payment statuses against OuiBoo's
    // records; disagreements become reconciliation alert records.
    await run('paymentReconciliation', () =>
      this.paymentReconciliationService.runReconciliation(),
    );
    // #415: persist licence/RC-insurance lapses as EXPIRED, auto-pause
    // the agency's ACTIVE trips (existing bookings untouched), notify.
    await run('licenceInsuranceExpirySweep', () =>
      this.agencyComplianceService.sweepExpiredLicencesAndInsurance(),
    );

    return { ranAt: new Date().toISOString(), results };
  }

  /**
   * #433 (Council P1-07): deadline cadence. Group-expiry and refund-due
   * evaluation used to wait for the daily 02:00 maintenance run, so a
   * group could sit expired — and a refund sit unactioned — for up to
   * ~24h. Vercel Cron now invokes this endpoint HOURLY (see
   * apps/api/vercel.json); the daily maintenance run still executes the
   * same jobs as a backstop. Only the deadline-critical jobs run here.
   */
  @Post('deadlines')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Run deadline jobs hourly (Vercel Cron, #433)',
    description:
      'Evaluates staged-payment group confirmation deadlines and the ' +
      'refund-due / refund-overdue sweeps. Intended to be called by ' +
      'Vercel Cron hourly, not by users.',
  })
  @ApiResponse({ status: 200, description: 'Deadline jobs completed' })
  @ApiResponse({ status: 401, description: 'Invalid or missing cron secret' })
  async runDeadlines(@Headers('authorization') authorization?: string) {
    this.validateCronSecret(authorization);
    const results = await this.runDeadlineJobs();
    const failures = Object.entries(results)
      .filter(([, value]) => value === 'failed')
      .map(([name]) => name);
    if (failures.length > 0) {
      await this.emitCronAlert(
        `Deadline job failure: ${failures.join(', ')}`,
        { results },
      );
    }
    return { ranAt: new Date().toISOString(), results };
  }

  /**
   * The deadline-critical subset of maintenance (#369 group confirmation
   * deadlines, #370 refund-due case sync + overdue sweep). Failures are
   * isolated per job. A sweep that newly marks refunds overdue emits an
   * alert: an overdue refund needs a human, not just a log line.
   */
  private async runDeadlineJobs(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        const value = await fn();
        results[name] = 'ok';
        return value;
      } catch (error) {
        this.logger.error(`Deadline job ${name} failed`, error);
        results[name] = 'failed';
        return undefined;
      }
    };

    // #369: fail/confirm staged sessions whose confirmation deadline passed.
    await run('groupConfirmationDeadlines', () =>
      this.stagedPaymentsService.evaluateConfirmationDeadlines(),
    );
    // #370: backstop — create RefundCases for any REFUND_DUE plan that
    // does not have one yet (e.g. flipped before #370 shipped).
    await run('refundDueCaseSync', () =>
      this.refundsService.syncRefundDueCases(),
    );
    // #370: flip actionable refund cases past their SLA deadline to
    // REFUND_OVERDUE and apply the new-bookings restriction ladder.
    const overdue = (await run('refundOverdueSweep', () =>
      this.refundsService.markOverdueCases(),
    )) as { marked?: number } | undefined;
    if (overdue && typeof overdue.marked === 'number' && overdue.marked > 0) {
      await this.emitCronAlert(
        `${overdue.marked} refund case(s) newly marked REFUND_OVERDUE`,
        { marked: overdue.marked },
      );
    }
    return results;
  }

  /**
   * #433 alert call site (delivery itself is #399's monitoring work):
   * always writes a structured [CRON ALERT] error log — the sink #399's
   * log drain consumes — and, when ALERT_WEBHOOK_URL is configured, posts
   * the alert to it. Webhook delivery is best-effort: it must never fail
   * the cron run.
   */
  private async emitCronAlert(message: string, context: Record<string, unknown>): Promise<void> {
    this.logger.error(`[CRON ALERT] ${message}`, JSON.stringify(context));
    const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
    if (!webhook) return;
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'ouiboo-cron',
          alert: message,
          context,
          at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      this.logger.error('[CRON ALERT] webhook delivery failed', error);
    }
  }
}
