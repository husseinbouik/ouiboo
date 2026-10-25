/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripStatus } from '@ouiboo/types';
import { TripDetailHeader } from './TripDetailHeader';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const baseProps = {
  tripId: 'trip-1',
  tripTitle: 'Sahara Trek',
  isDeleting: false,
  isArchiving: false,
  isDeactivating: false,
  isActivating: false,
  isRestoring: false,
  onDelete: jest.fn(),
  onDeactivate: jest.fn(),
  onActivate: jest.fn(),
  onRestore: jest.fn(),
};

describe('TripDetailHeader (#468 share action)', () => {
  it('shows the share action for an active trip', () => {
    render(<TripDetailHeader {...baseProps} tripStatus={TripStatus.Active} />);
    expect(screen.getByRole('button', { name: 'share.button' })).not.toBeNull();
  });

  it('hides the share action when the trip has no public page', () => {
    const { rerender } = render(<TripDetailHeader {...baseProps} tripStatus={TripStatus.Draft} />);
    expect(screen.queryByRole('button', { name: 'share.button' })).toBeNull();

    rerender(<TripDetailHeader {...baseProps} tripStatus={TripStatus.Archived} />);
    expect(screen.queryByRole('button', { name: 'share.button' })).toBeNull();

    rerender(<TripDetailHeader {...baseProps} tripStatus={TripStatus.Inactive} />);
    expect(screen.queryByRole('button', { name: 'share.button' })).toBeNull();
  });

  it('hides the share action when the trip title is unavailable', () => {
    render(<TripDetailHeader {...baseProps} tripTitle={undefined} tripStatus={TripStatus.Active} />);
    expect(screen.queryByRole('button', { name: 'share.button' })).toBeNull();
  });
});
