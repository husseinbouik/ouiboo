/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HelpCentrePage from './page';

const postCalls: unknown[][] = [];
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => {
      postCalls.push(args);
      return Promise.resolve({ data: { id: 'ticket-1', status: 'OPEN' } });
    },
  },
}));
const post = { mockClear: () => postCalls.splice(0, postCalls.length) };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Echo the key (plus a searchable marker for one FAQ entry) so the
    // search filter can be exercised without loading real locales;
    // real en/fr/ar copy is parity-checked in locales-parity.test.ts.
    t: (key: string) => (key === 'help.faq.refundTiming.answer' ? `${key} seven-days` : key),
    i18n: { language: 'en' },
  }),
}));

describe('HelpCentrePage (#446)', () => {
  beforeEach(() => post.mockClear());

  it('renders the FAQ and the ticket form', () => {
    render(<HelpCentrePage />);
    expect(screen.getByText('help.title')).not.toBeNull();
    expect(screen.getByText('help.faq.bookingConfirmation.question')).not.toBeNull();
    expect(screen.getByText('help.form.title')).not.toBeNull();
    expect(screen.getByLabelText(/help\.form\.subject/)).not.toBeNull();
  });

  it('filters the FAQ by the search query', () => {
    render(<HelpCentrePage />);
    fireEvent.change(screen.getByLabelText('help.searchLabel'), { target: { value: 'seven-days' } });
    expect(screen.getByText('help.faq.refundTiming.question')).not.toBeNull();
    expect(screen.queryByText('help.faq.bookingConfirmation.question')).toBeNull();
  });

  it('opens a support ticket through the API and confirms receipt', async () => {
    render(<HelpCentrePage />);
    fireEvent.change(screen.getByLabelText(/help\.form\.name/), { target: { value: 'Amine' } });
    fireEvent.change(screen.getByLabelText(/help\.form\.email/), { target: { value: 'amine@example.com' } });
    fireEvent.change(screen.getByLabelText(/help\.form\.subject/), { target: { value: 'Booking pending' } });
    fireEvent.change(screen.getByLabelText(/help\.form\.message/), {
      target: { value: 'My booking is still pending after uploading the proof.' },
    });
    fireEvent.click(screen.getByText('help.form.submit'));
    await waitFor(() => expect(postCalls.length).toBe(1));
    expect(postCalls[0][0]).toBe('/support/tickets');
    expect(postCalls[0][1]).toMatchObject({
      requesterEmail: 'amine@example.com',
      category: 'BOOKING',
      requesterRole: 'TRAVELER',
    });
    expect(await screen.findByTestId('help-ticket-received')).not.toBeNull();
  });
});
