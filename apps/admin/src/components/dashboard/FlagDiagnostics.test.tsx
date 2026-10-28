/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlagDiagnostics from './FlagDiagnostics';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;
const t = (key: string) => key;

function renderDiagnostics() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FlagDiagnostics t={t} />
    </QueryClientProvider>,
  );
}

describe('FlagDiagnostics (#580 rework)', () => {
  beforeEach(() => getMock.mockReset());

  it('renders the server flags returned by the diagnostics endpoint', async () => {
    getMock.mockResolvedValue({
      data: {
        generatedAt: '2026-10-28T00:00:00.000Z',
        environment: 'production',
        featureFlags: [{ name: 'NEW_CHECKOUT', enabled: true }],
        flags: { madOnlyCatalog: true, adminMfaRequired: false },
      },
    });
    renderDiagnostics();
    await waitFor(() => expect(screen.getByText(/FEATURE_NEW_CHECKOUT/)).not.toBeNull());
    expect(getMock).toHaveBeenCalledWith('/admin/diagnostics/flags');
    expect(screen.getByText(/dashboard\.diagnostics\.madOnlyCatalog/)).not.toBeNull();
  });

  it('shows the unavailable line — never guessed values — when the endpoint errors', async () => {
    getMock.mockRejectedValue(new Error('boom'));
    renderDiagnostics();
    await waitFor(() =>
      expect(screen.getByText('dashboard.diagnostics.serverFlagsUnavailable')).not.toBeNull(),
    );
    expect(screen.queryByText(/FEATURE_/)).toBeNull();
  });
});
