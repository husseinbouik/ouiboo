import { NotificationJobsService } from './notification-jobs.service';

describe('NotificationJobsService subscription renewal reminders (#324)', () => {
  const endsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const profile = {
    id: 'agency-1',
    companyName: 'Atlas Adventures SARL',
    subscriptionEndsAt: endsAt,
    renewalReminderSentFor: null as Date | null,
    user: { email: 'owner@atlas.test' },
  };

  const build = (profiles: Array<typeof profile>) => {
    const prisma = {
      agencyProfile: {
        findMany: jest.fn(async () => profiles),
        update: jest.fn(async () => ({})),
      },
    };
    const emailService = {
      sendSubscriptionRenewalReminder: jest.fn(async () => ({})),
    };
    const service = new NotificationJobsService(prisma as never, emailService as never);
    return { service, prisma, emailService };
  };

  it('emails an agency renewing within 3 days and marks the period as reminded', async () => {
    const { service, prisma, emailService } = build([{ ...profile }]);
    await service.sendSubscriptionRenewalReminders();
    expect(emailService.sendSubscriptionRenewalReminder).toHaveBeenCalledWith(
      'owner@atlas.test',
      'Atlas Adventures SARL',
      endsAt.toISOString().slice(0, 10),
      expect.stringContaining('/dashboard/settings/billing'),
    );
    expect(prisma.agencyProfile.update).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      data: { renewalReminderSentFor: endsAt },
    });
  });

  it('does not re-send for a period already reminded', async () => {
    const { service, emailService } = build([{ ...profile, renewalReminderSentFor: endsAt }]);
    await service.sendSubscriptionRenewalReminders();
    expect(emailService.sendSubscriptionRenewalReminder).not.toHaveBeenCalled();
  });

  it('isolates a failing recipient from the rest of the batch', async () => {
    const failing = { ...profile, id: 'agency-bad' };
    const good = { ...profile, id: 'agency-good' };
    const { service, emailService } = build([failing, good]);
    emailService.sendSubscriptionRenewalReminder
      .mockRejectedValueOnce(new Error('SMTP down'))
      .mockResolvedValue({});
    await service.sendSubscriptionRenewalReminders();
    expect(emailService.sendSubscriptionRenewalReminder).toHaveBeenCalledTimes(2);
  });
});
