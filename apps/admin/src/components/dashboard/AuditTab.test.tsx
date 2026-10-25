/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AuditTab from './AuditTab';
import type { AdminAuditLog } from './types';

const t = (key: string, opts?: Record<string, unknown>) =>
  typeof opts?.defaultValue === 'string' ? (opts.defaultValue as string) : key;

const paginationLabels = {
  showing: 'Showing',
  of: 'of',
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  goToPage: (page: number) => `Go to page ${page}`,
};

const interventionLog: AdminAuditLog = {
  id: 'log-1234567890',
  createdAt: '2026-10-24T09:30:00.000Z',
  actorId: 'admin-1',
  actorEmail: 'ops@ouiboo.example',
  action: 'ADMIN_GROUP_CLOSED',
  targetType: 'TripSession',
  targetId: 'sess-42',
  metadata: { reason: 'Minimum unreachable', sessionId: 'sess-42' },
};

const systemLog: AdminAuditLog = {
  id: 'log-abcdefghij',
  createdAt: '2026-10-24T08:00:00.000Z',
  actorId: null,
  actorEmail: null,
  action: 'BOOKING_CREATED',
  targetType: 'Booking',
  targetId: null,
  metadata: null,
};

function renderTab(overrides: Partial<React.ComponentProps<typeof AuditTab>> = {}) {
  const handlers = {
    onPageChange: jest.fn(),
    onRetentionDaysChange: jest.fn(),
    onExportAuditLogs: jest.fn(),
    onPruneAuditLogs: jest.fn(),
  };
  const utils = render(
    <AuditTab
      t={t}
      logs={[interventionLog, systemLog]}
      pagination={null}
      paginationLabels={paginationLabels}
      auditFeedback={null}
      retentionDays="90"
      isExporting={false}
      isPruning={false}
      {...handlers}
      {...overrides}
    />,
  );
  return { ...utils, handlers };
}

describe('AuditTab', () => {
  it('renders intervention actions as readable labels and unknown actions raw (#423)', () => {
    renderTab();
    expect(screen.getByText('dashboard.auditActions.ADMIN_GROUP_CLOSED')).not.toBeNull();
    expect(screen.getByText('BOOKING_CREATED')).not.toBeNull();
    expect(screen.getByText('ops@ouiboo.example')).not.toBeNull();
    expect(screen.getByText('TripSession')).not.toBeNull();
    expect(screen.getByText(/Minimum unreachable/)).not.toBeNull();
  });

  it('falls back to system actor and empty metadata placeholders', () => {
    renderTab();
    expect(screen.getByText('dashboard.labels.system')).not.toBeNull();
    expect(screen.getByText('dashboard.labels.noActorId')).not.toBeNull();
    expect(screen.getByText('dashboard.labels.noTargetId')).not.toBeNull();
    expect(screen.getByText('dashboard.audit.noMetadata')).not.toBeNull();
  });

  it('renders the empty state when there are no logs', () => {
    renderTab({ logs: [] });
    expect(screen.getByText('dashboard.audit.noResults')).not.toBeNull();
  });

  it('wires retention input, export and prune controls', () => {
    const { handlers } = renderTab();
    fireEvent.change(screen.getByDisplayValue('90'), { target: { value: '30' } });
    expect(handlers.onRetentionDaysChange).toHaveBeenCalledWith('30');
    fireEvent.click(screen.getByRole('button', { name: /dashboard\.audit\.downloadCsv/ }));
    expect(handlers.onExportAuditLogs).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /dashboard\.audit\.pruneOldLogs/ }));
    expect(handlers.onPruneAuditLogs).toHaveBeenCalledTimes(1);
  });

  it('disables export and prune while they run and shows feedback', () => {
    renderTab({
      isExporting: true,
      isPruning: true,
      auditFeedback: { type: 'error', message: 'Export failed' },
    });
    expect(screen.getByText('Export failed').className).toContain('text-danger');
    expect(screen.getAllByRole('button', { name: /dashboard\.audit\.exporting/ })[0]).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /dashboard\.audit\.pruning/ })).toHaveProperty('disabled', true);
  });
});
