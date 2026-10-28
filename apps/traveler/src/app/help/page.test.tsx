/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HelpCentrePage from './page';

const mockPostCalls: unknown[][] = [];
const mockPostBehavior = { fail: false };
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => {
      mockPostCalls.push(args);
      return mockPostBehavior.fail
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ data: { id: 'ticket-1', status: 'OPEN' } });
    },
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Echo the key (plus a searchable marker for one FAQ entry) so the
    // search filter can be exercised without loading real locales;
    // real en/fr/ar copy is parity-checked in locales-parity.test.ts.
    t: (key: string) => (key === 'help.faq.refundTiming.answer' ? `${key} seven-days` : key),
    i18n: { language: 'en' },
  }),
}));

function fillForm() {
  fireEvent.change(screen.getByLabelText(/help\.form\.name/), { target: { value: 'Amine' } });
  fireEvent.change(screen.getByLabelText(/help\.form\.email/), { target: { value: 'amine@example.com' } });
  fireEvent.change(screen.getByLabelText(/help\.form\.subject/), { target: { value: 'Booking pending' } });
  fireEvent.change(screen.getByLabelText(/help\.form\.message/), {
    target: { value: 'My booking is still pending after uploading the proof.' },
  });
}

describe('HelpCentrePage (#446)', () => {
  beforeEach(() => {
    mockPostCalls.splice(0, mockPostCalls.length);
    mockPostBehavior.fail = false;
  });

  it('renders the FAQ and the ticket form', () => {
    render(<HelpCentrePage />);
    expect(screen.getByText('help.title')).not.toBeNull();
    expect(screen.getByText('help.faq.bookingConfirmation.question')).not.toBeNull();
    expect(screen.getByText('help.form.title')).not.toBeNull();
    expect(screen.getByLabelText(/help\.form\.subject/)).not.toBeNull();
  });

  it('expands and collapses FAQ entries', () => {
    render(<HelpCentrePage />);
    // first entry starts open
    expect(screen.getByText('help.faq.bookingConfirmation.answer')).not.toBeNull();
    fireEvent.click(screen.getByText('help.faq.bookingConfirmation.question'));
    expect(screen.queryByText('help.faq.bookingConfirmation.answer')).toBeNull();
    fireEvent.click(screen.getByText('help.faq.paymentProof.question'));
    expect(screen.getByText('help.faq.paymentProof.answer')).not.toBeNull();
  });

  it('filters the FAQ by the search query and reports when nothing matches', () => {
    render(<HelpCentrePage />);
    fireEvent.change(screen.getByLabelText('help.searchLabel'), { target: { value: 'seven-days' } });
    expect(screen.getByText('help.faq.refundTiming.question')).not.toBeNull();
    expect(screen.queryByText('help.faq.bookingConfirmation.question')).toBeNull();

    fireEvent.change(screen.getByLabelText('help.searchLabel'), { target: { value: 'no-such-topic' } });
    expect(screen.getByText('help.noResults')).not.toBeNull();
  });

  it('opens a support ticket through the API and confirms receipt', async () => {
    render(<HelpCentrePage />);
    fillForm();
    fireEvent.click(screen.getByText('help.form.submit'));
    await waitFor(() => expect(mockPostCalls.length).toBe(1));
    expect(mockPostCalls[0][0]).toBe('/support/tickets');
    expect(mockPostCalls[0][1]).toMatchObject({
      requesterEmail: 'amine@example.com',
      category: 'BOOKING',
      requesterRole: 'TRAVELER',
    });
    expect(await screen.findByTestId('help-ticket-received')).not.toBeNull();
  });

  it('shows an error (and keeps the form) when ticket creation fails', async () => {
    mockPostBehavior.fail = true;
    render(<HelpCentrePage />);
    fillForm();
    fireEvent.click(screen.getByText('help.form.submit'));
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByText('help.form.error')).not.toBeNull();
    expect(screen.queryByTestId('help-ticket-received')).toBeNull();
  });
});
