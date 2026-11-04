/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PushNotificationToggle } from './PushNotificationToggle';

const mockSupported = jest.fn();
const mockGetSubscription = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/push-notifications', () => ({
  isPushSupported: () => mockSupported(),
  getCurrentPushSubscription: () => mockGetSubscription(),
  subscribeToPush: () => mockSubscribe(),
  unsubscribeFromPush: () => mockUnsubscribe(),
}));

describe('PushNotificationToggle (#784)', () => {
  beforeEach(() => {
    mockSupported.mockReset();
    mockGetSubscription.mockReset();
    mockSubscribe.mockReset();
    mockUnsubscribe.mockReset();
  });

  it('explains instead of offering a dead button on unsupported browsers', async () => {
    mockSupported.mockReturnValue(false);
    render(<PushNotificationToggle />);
    await waitFor(() =>
      expect(screen.getByText('notifications.push.unsupportedBody')).toBeTruthy(),
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers enable when supported and not yet subscribed, then subscribes', async () => {
    mockSupported.mockReturnValue(true);
    mockGetSubscription.mockResolvedValue(null);
    mockSubscribe.mockResolvedValue('subscribed');
    render(<PushNotificationToggle />);
    const button = await screen.findByRole('button', {
      name: 'notifications.push.enable',
    });
    fireEvent.click(button);
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText('notifications.push.subscribedBody')).toBeTruthy(),
    );
  });

  it('offers disable when subscribed, then unsubscribes', async () => {
    mockSupported.mockReturnValue(true);
    mockGetSubscription.mockResolvedValue({ endpoint: 'https://push.example.com/x' });
    mockUnsubscribe.mockResolvedValue('unsubscribed');
    render(<PushNotificationToggle />);
    const button = await screen.findByRole('button', {
      name: 'notifications.push.disable',
    });
    fireEvent.click(button);
    await waitFor(() => expect(mockUnsubscribe).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText('notifications.push.unsubscribedBody')).toBeTruthy(),
    );
  });
});
