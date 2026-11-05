import 'reflect-metadata';
import { NotificationsController } from './notifications.controller';

// The push stack is irrelevant to the count route — keep this spec
// from loading web-push at all.
jest.mock('./push-notifications.service', () => ({
  PushNotificationsService: class PushNotificationsService {},
}));

/**
 * #849: GET /notifications/unread-count backs the traveller header
 * bell badge. It must delegate to the existing service count for the
 * authenticated user and answer in the { count } shape the wishlist
 * count endpoint established.
 */
describe('Notifications controller (#849)', () => {
  it('unread-count delegates to the service for the current user and returns { count }', async () => {
    const calls: string[] = [];
    const fakeNotificationsService = {
      getUnreadNotificationCount: async (userId: string) => {
        calls.push(userId);
        return 7;
      },
    };
    const controller = new NotificationsController(
      fakeNotificationsService as never,
      {} as never,
    );

    await expect(
      controller.getUnreadCount({ user: { id: 'user-1' } }),
    ).resolves.toEqual({ count: 7 });
    expect(calls).toEqual(['user-1']);
  });

  it('unread-count returns zero cleanly when nothing is unread', async () => {
    const fakeNotificationsService = {
      getUnreadNotificationCount: async () => 0,
    };
    const controller = new NotificationsController(
      fakeNotificationsService as never,
      {} as never,
    );

    await expect(
      controller.getUnreadCount({ user: { id: 'user-2' } }),
    ).resolves.toEqual({ count: 0 });
  });
});

/**
 * #852: GET /notifications is the traveller notifications page's list
 * call. It must delegate to the same history query the /history route
 * uses (defaults limit=50, page=1) and reshape the email-log rows to
 * the page's { items } contract: title ← subject, type ←
 * notificationType, createdAt ← sentAt, read=false (NotificationLog
 * has no read state), keeping the pagination metadata.
 */
describe('Notifications controller (#852)', () => {
  const sentAt = new Date('2026-11-04T21:45:03.000Z');
  const historyResult = {
    data: [
      {
        id: 'log-1',
        userId: 'user-1',
        notificationType: 'REVIEW_RESPONSE',
        recipientEmail: 'staging-traveler@ouiboo.test',
        subject: 'The agency replied to your review',
        message: 'Staging Test Agency replied to your review',
        status: 'SENT',
        sentAt,
        failureReason: null,
        metadata: null,
      },
    ],
    pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
  };

  it('list delegates to getNotificationHistory with defaults and maps the page shape', async () => {
    const calls: unknown[][] = [];
    const fakeNotificationsService = {
      getNotificationHistory: async (...args: unknown[]) => {
        calls.push(args);
        return historyResult;
      },
    };
    const controller = new NotificationsController(
      fakeNotificationsService as never,
      {} as never,
    );

    const result = await controller.listNotifications({ user: { id: 'user-1' } });

    expect(calls).toEqual([['user-1', 50, 1]]);
    expect(result).toEqual({
      items: [
        {
          id: 'log-1',
          title: 'The agency replied to your review',
          message: 'Staging Test Agency replied to your review',
          type: 'REVIEW_RESPONSE',
          read: false,
          createdAt: sentAt,
        },
      ],
      pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
  });

  it('list forwards limit/page query params as numbers', async () => {
    const calls: unknown[][] = [];
    const fakeNotificationsService = {
      getNotificationHistory: async (...args: unknown[]) => {
        calls.push(args);
        return { data: [], pagination: { total: 0, page: 3, limit: 10, totalPages: 0 } };
      },
    };
    const controller = new NotificationsController(
      fakeNotificationsService as never,
      {} as never,
    );

    const result = await controller.listNotifications({ user: { id: 'user-9' } }, '10', '3');

    expect(calls).toEqual([['user-9', 10, 3]]);
    expect(result.items).toEqual([]);
  });
});
