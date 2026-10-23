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
    // #369: fail/confirm staged sessions whose confirmation deadline passed.
    await run('groupConfirmationDeadlines', () =>
      this.stagedPaymentsService.evaluateConfirmationDeadlines(),
    );

    return { ranAt: new Date().toISOString(), results };
  }
}
