import { PushNotificationsService } from './push-notifications.service';

/**
 * #784: web push — subscription ownership, preference gating, and
 * prune-on-410 with a mocked push sender (no network, no real push
 * service, no real VAPID delivery).
 */
describe('PushNotificationsService (#784)', () => {
  const ENV_KEYS = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  });

  afterAll(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  const subscriptionRow = {
    id: 'sub-1',
    userId: 'user-1',
    endpoint: 'https://push.example.com/sub-1',
    p256dh: 'p256dh-key',
    auth: 'auth-secret',
    userAgent: 'jest',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const build = (overrides: {
    preference?: Record<string, unknown> | null;
    subscriptions?: Array<typeof subscriptionRow>;
    sendImpl?: (sub: never, payload: string) => Promise<void>;
  } = {}) => {
    const preference =
      overrides.preference === undefined
        ? {
            userId: 'user-1',
            pushNotifications: true,
            paymentReminder: true,
            tripReminder: true,
            bookingConfirmation: true,
            cancellationAlert: true,
            reviewRequest: true,
            emailNotifications: true,
          }
        : overrides.preference;
    const prisma = {
      pushSubscription: {
        upsert: jest.fn(async (args: never) => ({ id: 'sub-1', ...(args as object) })),
        deleteMany: jest.fn(async () => ({ count: 1 })),
        delete: jest.fn(async () => ({})),
        findMany: jest.fn(async () => overrides.subscriptions ?? [subscriptionRow]),
      },
      notificationPreference: {
        findUnique: jest.fn(async () => preference),
        upsert: jest.fn(async () => ({})),
      },
    };
    const sender = {
      send: jest.fn(overrides.sendImpl ?? (async () => undefined)),
    };
    const service = new PushNotificationsService(prisma as never, sender as never);
    return { service, prisma, sender };
  };

  describe('subscribe / unsubscribe ownership', () => {
    it('stores the subscription bound to the caller and turns the push channel on', async () => {
      const { service, prisma } = build();
      await service.subscribe('user-1', {
        endpoint: 'https://push.example.com/sub-1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
        userAgent: 'jest',
      });
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: 'https://push.example.com/sub-1' },
          create: expect.objectContaining({ userId: 'user-1' }),
          update: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: { pushNotifications: true },
        }),
      );
    });

    it('unsubscribe only ever deletes rows owned by the caller', async () => {
      const { service, prisma } = build();
      const result = await service.unsubscribe('user-1', 'https://push.example.com/sub-1');
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'https://push.example.com/sub-1', userId: 'user-1' },
      });
      expect(result).toEqual({ removed: 1 });
    });

    it('exposes the configured public key for the browser', () => {
      const { service } = build();
      expect(service.getPublicKey()).toEqual({
        publicKey: 'test-public-key',
        enabled: true,
      });
    });
  });

  describe('preference gating', () => {
    it('sends to every active subscription when channel + category allow', async () => {
      const { service, sender } = build();
      const result = await service.sendToUser('user-1', 'BOOKING_CONFIRMATION', {
        title: 'Booking confirmed',
        body: 'See you soon',
        url: '/bookings/b1',
      });
      expect(sender.send).toHaveBeenCalledTimes(1);
      expect(sender.send).toHaveBeenCalledWith(
        {
          endpoint: 'https://push.example.com/sub-1',
          keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
        },
        expect.stringContaining('"url":"/bookings/b1"'),
      );
      expect(result).toEqual({ sent: 1, pruned: 0 });
    });

    it('does not send when the push channel is off', async () => {
      const { service, sender } = build({
        preference: { pushNotifications: false, bookingConfirmation: true },
      });
      const result = await service.sendToUser('user-1', 'BOOKING_CONFIRMATION', {
        title: 't',
        body: 'b',
      });
      expect(sender.send).not.toHaveBeenCalled();
      expect(result.skipped).toBe('channel-off');
    });

    it('does not send when the user has no preference row (never opted in)', async () => {
      const { service, sender } = build({ preference: null });
      const result = await service.sendToUser('user-1', 'TRIP_REMINDER', {
        title: 't',
        body: 'b',
      });
      expect(sender.send).not.toHaveBeenCalled();
      expect(result.skipped).toBe('channel-off');
    });

    it('does not send when the category switch is off, even with the channel on', async () => {
      const { service, sender } = build({
        preference: { pushNotifications: true, paymentReminder: false },
      });
      const result = await service.sendToUser('user-1', 'PAYMENT_REMINDER', {
        title: 't',
        body: 'b',
      });
      expect(sender.send).not.toHaveBeenCalled();
      expect(result.skipped).toBe('category-off');
    });

    it('REVIEW_RESPONSE rides on the reviewRequest category switch', async () => {
      const { service, sender } = build({
        preference: { pushNotifications: true, reviewRequest: false },
      });
      const result = await service.sendToUser('user-1', 'REVIEW_RESPONSE', {
        title: 't',
        body: 'b',
      });
      expect(sender.send).not.toHaveBeenCalled();
      expect(result.skipped).toBe('category-off');
    });

    it('no-ops safely when VAPID is not configured', async () => {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PUBLIC_KEY;
      try {
        const { service, sender } = build();
        const result = await service.sendToUser('user-1', 'BOOKING_CONFIRMATION', {
          title: 't',
          body: 'b',
        });
        expect(sender.send).not.toHaveBeenCalled();
        expect(result.skipped).toBe('not-configured');
      } finally {
        process.env.VAPID_PUBLIC_KEY = publicKey;
      }
    });
  });

  describe('delivery + pruning', () => {
    it('prunes a subscription the push service reports gone (410)', async () => {
      const gone = Object.assign(new Error('Gone'), { statusCode: 410 });
      const { service, prisma } = build({
        sendImpl: async () => {
          throw gone;
        },
      });
      const result = await service.sendToUser('user-1', 'TRIP_REMINDER', {
        title: 't',
        body: 'b',
      });
      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
      expect(result).toEqual({ sent: 0, pruned: 1 });
    });

    it('prunes on 404 too, but keeps the subscription on transient failures', async () => {
      const notFound = Object.assign(new Error('Not Found'), { statusCode: 404 });
      const first = build({
        sendImpl: async () => {
          throw notFound;
        },
      });
      expect(
        await first.service.sendToUser('user-1', 'TRIP_REMINDER', { title: 't', body: 'b' }),
      ).toEqual({ sent: 0, pruned: 1 });

      const failing = build({
        sendImpl: async () => {
          throw Object.assign(new Error('Server error'), { statusCode: 500 });
        },
      });
      const result = await failing.service.sendToUser('user-1', 'TRIP_REMINDER', {
        title: 't',
        body: 'b',
      });
      expect(failing.prisma.pushSubscription.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, pruned: 0 });
    });

    it('one dead subscription does not block delivery to the others', async () => {
      const second = { ...subscriptionRow, id: 'sub-2', endpoint: 'https://push.example.com/sub-2' };
      let calls = 0;
      const { service, sender } = build({
        subscriptions: [subscriptionRow, second],
        sendImpl: async () => {
          calls += 1;
          if (calls === 1) throw Object.assign(new Error('Gone'), { statusCode: 410 });
        },
      });
      const result = await service.sendToUser('user-1', 'CANCELLATION', {
        title: 't',
        body: 'b',
      });
      expect(sender.send).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ sent: 1, pruned: 1 });
    });
  });
});
