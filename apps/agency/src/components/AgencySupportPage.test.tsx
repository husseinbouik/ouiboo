/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgencySupportPage } from './AgencySupportPage';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
}));

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Atlas Ops', email: 'ops@atlas.example', role: 'AGENCY' },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.hours ? `${key}:${options.hours}` : key,
    i18n: { language: 'en' },
  }),
}));

const postMock = apiClient.post as jest.Mock;

describe('AgencySupportPage (#556 rework)', () => {
  beforeEach(() => postMock.mockReset());

  it('renders the support block and the ticket form prefilled from the agency user', () => {
    render(<AgencySupportPage />);
    expect(screen.getByTestId('agency-support-page')).not.toBeNull();
    expect(screen.getByText('support.escalationRole')).not.toBeNull();
    expect((screen.getByLabelText('support.form.name') as HTMLInputElement).value).toBe('Atlas Ops');
    expect((screen.getByLabelText('support.form.email') as HTMLInputElement).value).toBe('ops@atlas.example');
  });

  it('posts the ticket with requesterRole=AGENCY and shows the received state', async () => {
    postMock.mockResolvedValue({ data: { id: 'ticket-1', status: 'OPEN' } });
    render(<AgencySupportPage />);
    fireEvent.change(screen.getByLabelText('support.form.subject'), { target: { value: 'Proof looks forged' } });
    fireEvent.change(screen.getByLabelText('support.form.message'), {
      target: { value: 'This payment proof looks forged, please review it.' },
    });
    fireEvent.click(screen.getByText('support.form.submit'));
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/support/tickets', expect.objectContaining({
        requesterRole: 'AGENCY',
        requesterName: 'Atlas Ops',
        requesterEmail: 'ops@atlas.example',
        subject: 'Proof looks forged',
      })),
    );
    await waitFor(() => expect(screen.getByTestId('agency-support-ticket-received')).not.toBeNull());
  });
});
