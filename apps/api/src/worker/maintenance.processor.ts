import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CurrencyService } from '../currency/currency.service';
import { NotificationJobsService } from '../notifications/notification-jobs.service';
import { MAINTENANCE_QUEUE, MaintenanceJobName } from './worker-queue.constants';

@Injectable()
@Processor(MAINTENANCE_QUEUE, { concurrency: 1 })
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(
    private readonly notificationJobs: NotificationJobsService,
    private readonly currencyService: CurrencyService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing maintenance job ${job.name}`);

    switch (job.name) {
      case MaintenanceJobName.PaymentProofReminders:
        return this.notificationJobs.sendPaymentProofReminders();
      case MaintenanceJobName.TripReminders7Days:
        return this.notificationJobs.sendTripReminders7DaysBefore();
      case MaintenanceJobName.TripReminders1Day:
        return this.notificationJobs.sendTripReminders1DayBefore();
      case MaintenanceJobName.AutoCancelUnpaidBookings:
        return this.notificationJobs.autoCancelUnpaidBookings();
      case MaintenanceJobName.ExchangeRateRefresh:
        return this.currencyService.updateExchangeRates();
      default:
        throw new Error(`Unknown maintenance job: ${job.name}`);
    }
  }
}
