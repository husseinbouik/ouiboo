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
