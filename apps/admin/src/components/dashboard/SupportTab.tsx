'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { LifeBuoy } from 'lucide-react';
import { Button, Card, CardContent } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import type { AdminSupportTicket, ApiErrorResponse, SupportTicketStatus } from './types';
import { getErrorMessage } from './dashboard-utils';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

export const SUPPORT_TICKET_STATUSES: SupportTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const SUPPORT_TICKET_CATEGORIES = [
  'BOOKING',
  'PAYMENT',
  'REFUND',
  'ACCOUNT',
  'TRIP',
  'COMPLAINT',
  'TECHNICAL',
  'OTHER',
] as const;

/**
 * #581 rework: the admin support queue. The ticketing API (#446) and the
 * beta-metrics ticket counts existed, but the admin app had no surface
 * for them — no nav entry, no palette entry, and /support 404'd (the
 * admin app is a single-page tab shell, so the queue lives here as the
 * SUPPORT tab; DashboardShell derives both the sidebar entry and the
 * ⌘K palette entry from the same navItems list).
 *
 * Reads GET /admin/support/tickets?status&category and writes status
 * transitions via PATCH /admin/support/tickets/:id. The API stamps
 * firstResponseAt on the first move out of OPEN — the UI only sends the
 * new status.
 */
export default function SupportTab({ t }: { t: TFn }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const ticketsQuery = useQuery<AdminSupportTicket[]>({
    queryKey: ['admin-support-tickets', statusFilter, categoryFilter],
    queryFn: async () => {
      const response = await apiClient.get('/admin/support/tickets', {
        params: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(categoryFilter ? { category: categoryFilter } : {}),
        },
      });
      return Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
    },
    staleTime: 15_000,
  });
  const tickets = ticketsQuery.data ?? [];
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SupportTicketStatus }) => {
      const response = await apiClient.patch(`/admin/support/tickets/${id}`, { status });
      return response.data as AdminSupportTicket;
    },
    onSuccess: (updated) => {
      setFeedback({ type: 'success', message: t('dashboard.support.feedback.updated') });
      setSelectedId(updated.id);
      void queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-beta-metrics'] });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.support.feedback.updateError')),
      });
    },
  });

  const selectClass =
    'rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sunset-orange/40';

  return (
    <div className="space-y-6" data-testid="admin-support-queue">
      <div className="flex flex-wrap items-center gap-3">
        <LifeBuoy className="h-5 w-5 text-sunset-orange" />
        <h2 className="text-xl font-bold text-foreground">{t('dashboard.support.title')}</h2>
        <span className="text-sm text-muted-foreground">
          {t('dashboard.support.count', { count: tickets.length })}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor="support-status-filter">
            {t('dashboard.support.filterStatus')}
          </label>
          <select
            id="support-status-filter"
            className={selectClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">{t('dashboard.support.allStatuses')}</option>
            {SUPPORT_TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <label className="text-xs font-semibold text-muted-foreground" htmlFor="support-category-filter">
            {t('dashboard.support.filterCategory')}
          </label>
          <select
            id="support-category-filter"
            className={selectClass}
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">{t('dashboard.support.allCategories')}</option>
            {SUPPORT_TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>
          {feedback.message}
        </p>
      )}
      {ticketsQuery.isLoading && <p className="text-sm text-muted-foreground">{t('dashboard.support.loading')}</p>}
      {ticketsQuery.isError && <p role="alert" className="text-sm font-semibold text-danger">{t('dashboard.support.loadError')}</p>}
      {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('dashboard.support.empty')}</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="border-none shadow-sm rounded-2xl bg-card">
            <CardContent className="p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground">{ticket.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    {ticket.requesterName} · {ticket.requesterEmail} · {ticket.requesterRole} · {ticket.category} ·{' '}
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{ticket.status}</span>
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(selectedId === ticket.id ? null : ticket.id)} aria-expanded={selectedId === ticket.id}>
                    {t('dashboard.support.details')}
                  </Button>
                </div>
              </div>
              {selectedId === ticket.id && (
                <div className="space-y-3 border-t border-border pt-3" data-testid="support-ticket-detail">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.message}</p>
                  <dl className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>{t('dashboard.support.bookingRef')}: {ticket.bookingRef || '—'}</div>
                    <div>{t('dashboard.support.firstResponse')}: {ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString() : '—'}</div>
                    <div>{t('dashboard.support.resolvedAt')}: {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : '—'}</div>
                    <div>{t('dashboard.support.ticketId')}: <span className="font-mono">{ticket.id}</span></div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor={`support-status-${ticket.id}`}>
                      {t('dashboard.support.setStatus')}
                    </label>
                    <select
                      id={`support-status-${ticket.id}`}
                      className={selectClass}
                      value={ticket.status}
                      disabled={updateMutation.isPending}
                      onChange={(event) =>
                        updateMutation.mutate({ id: ticket.id, status: event.target.value as SupportTicketStatus })
                      }
                    >
                      {SUPPORT_TICKET_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    {selected?.id === ticket.id && updateMutation.isPending && (
                      <span className="text-xs text-muted-foreground">{t('dashboard.support.updating')}</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
