import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MAINTENANCE_QUEUE, MaintenanceJobName } from './worker-queue.constants';

@Injectable()
export class MaintenanceSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceSchedulerService.name);

  constructor(@InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.scheduleRecurringJobs();
  }

  private async scheduleRecurringJobs() {
    await Promise.all([
      this.upsertRecurring(MaintenanceJobName.PaymentProofReminders, '0 */12 * * *'),
      this.upsertRecurring(MaintenanceJobName.AutoCancelUnpaidBookings, '0 */12 * * *'),
      this.upsertRecurring(MaintenanceJobName.TripReminders7Days, '0 9 * * *'),
      this.upsertRecurring(MaintenanceJobName.TripReminders1Day, '0 8 * * *'),
      this.upsertRecurring(MaintenanceJobName.ExchangeRateRefresh, '0 0 * * *'),
    ]);
  }

  private async upsertRecurring(name: string, pattern: string) {
    await this.queue.add(
      name,
      {},
      {
        jobId: `recurring:${name}`,
        repeat: { pattern },
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30_000,
        },
      },
    );
    this.logger.log(`Scheduled ${name} with cron ${pattern}`);
  }
}
