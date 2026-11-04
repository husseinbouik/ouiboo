/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgencyDataExport } from './AgencyDataExport';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('AgencyDataExport (#780)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockResolvedValue({
      data: 'id,title\n1,B Trip',
      headers: {
        'content-disposition': 'attachment; filename="ouiboo-trips-2026-11-04.csv"',
      },
    });
    URL.createObjectURL = jest.fn(() => 'blob:export');
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders one download control per export kind', () => {
    render(<AgencyDataExport />);
    expect(screen.getByRole('button', { name: /exportData\.bookings/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /exportData\.trips/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /exportData\.reviews/ })).not.toBeNull();
  });

  it('downloads the bookings CSV through the authenticated API client', async () => {
    const user = userEvent.setup();
    render(<AgencyDataExport />);

    await user.click(screen.getByRole('button', { name: /exportData\.bookings/ }));

    expect(mockedGet).toHaveBeenCalledWith('/agency/exports/bookings', {
      responseType: 'blob',
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('downloads trips and reviews from their own endpoints', async () => {
    const user = userEvent.setup();
    render(<AgencyDataExport />);

    await user.click(screen.getByRole('button', { name: /exportData\.trips/ }));
    await user.click(screen.getByRole('button', { name: /exportData\.reviews/ }));

    expect(mockedGet).toHaveBeenCalledWith('/agency/exports/trips', {
      responseType: 'blob',
    });
    expect(mockedGet).toHaveBeenCalledWith('/agency/exports/reviews', {
      responseType: 'blob',
    });
  });

  it('shows an error when the export fails', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<AgencyDataExport />);

    await user.click(screen.getByRole('button', { name: /exportData\.reviews/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('exportData.error');
  });
});
