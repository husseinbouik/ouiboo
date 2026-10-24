'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Download } from 'lucide-react';
import { Button, Card, Pagination } from '@ouiboo/ui';
import { toPaginatedList, type PaginationMeta } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import type { AdminAgency, AdminInvoice, FeedbackState } from './types';
import { formatDateTime } from './formatters';
import { resolveInvoiceGenerateErrorKey } from './dashboard-utils';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type InvoicesTabProps = {
  t: TFn;
  invoices: AdminInvoice[];
  pagination: PaginationMeta | null;
  onPageChange: (page: number) => void;
  paginationLabels: {
    showing: string;
    of: string;
    pagination: string;
    previousPage: string;
    nextPage: string;
    goToPage: (page: number) => string;
  };
};

// #359: admin view of issued platform service fee invoices + the manual
// monthly generation trigger (a scheduler is a follow-up; generation is
// admin-triggered and idempotent per agency+period).
export default function InvoicesTab({ t, invoices, pagination, onPageChange, paginationLabels }: InvoicesTabProps) {
  const queryClient = useQueryClient();
  const [agencyId, setAgencyId] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [rate, setRate] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: agenciesRaw } = useQuery<unknown>({
    queryKey: ['admin-invoice-agencies'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/agencies', { params: { page: 1, limit: 200 } });
      return resp.data;
    },
  });
  const { data: agencies } = toPaginatedList<AdminAgency>(agenciesRaw);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiClient.post('/admin/invoices/generate', {
        agencyId,
        year: Number(year),
        month: Number(month),
        ...(rate.trim() ? { commissionRatePercent: Number(rate) } : {}),
      });
      return resp.data as AdminInvoice;
    },
    onSuccess: (invoice) => {
      setFeedback({ type: 'success', message: t('dashboard.invoices.generated', { number: invoice.number }) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      // #374: surface the API's specific failure (e.g. no billable bookings
      // for the period) instead of one generic message for every failure.
      setFeedback({ type: 'error', message: t(resolveInvoiceGenerateErrorKey(error)) });
    },
  });

  const canGenerate =
    agencyId !== '' &&
    /^\d{4}$/.test(year) &&
    /^(0?[1-9]|1[0-2])$/.test(month) &&
    (rate.trim() === '' || (!Number.isNaN(Number(rate)) && Number(rate) > 0 && Number(rate) <= 100));

  const downloadInvoice = async (invoice: AdminInvoice) => {
    setDownloadingId(invoice.id);
    try {
      const resp = await apiClient.get(`/admin/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setFeedback({ type: 'error', message: t('dashboard.invoices.downloadError') });
    } finally {
      setDownloadingId(null);
    }
  };

  const periodLabel = (invoice: AdminInvoice) =>
    new Date(invoice.periodStart).toISOString().slice(0, 7);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Receipt className="h-5 w-5 text-sunset-orange" />
        {t('dashboard.invoices.title', { total: pagination?.total ?? invoices.length })}
      </h2>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground">{t('dashboard.invoices.generateTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">{t('dashboard.invoices.agency')}</span>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
            >
              <option value="">{t('dashboard.invoices.selectAgency')}</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{t('dashboard.invoices.month')}</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              inputMode="numeric"
              placeholder="10"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{t('dashboard.invoices.year')}</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              inputMode="numeric"
              placeholder="2026"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{t('dashboard.invoices.rate')}</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              inputMode="decimal"
              placeholder="%"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => generateMutation.mutate()} disabled={!canGenerate || generateMutation.isPending}>
            {t('dashboard.invoices.generate')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('dashboard.invoices.generateHint')}</p>
        </div>
        {feedback && (
          <p className={`text-sm ${feedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{feedback.message}</p>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        {invoices.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t('dashboard.invoices.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">{t('dashboard.invoices.number')}</th>
                <th className="px-4 py-3">{t('dashboard.invoices.agency')}</th>
                <th className="px-4 py-3">{t('dashboard.invoices.period')}</th>
                <th className="px-4 py-3">{t('dashboard.invoices.issued')}</th>
                <th className="px-4 py-3 text-right">{t('dashboard.invoices.gross')}</th>
                <th className="px-4 py-3 text-right">{t('dashboard.invoices.fee')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-semibold text-foreground">{invoice.number}</td>
                  <td className="px-4 py-3">{invoice.agencyName}</td>
                  <td className="px-4 py-3">{periodLabel(invoice)}</td>
                  <td className="px-4 py-3">{formatDateTime(invoice.issuedAt, t)}</td>
                  <td className="px-4 py-3 text-right">
                    {invoice.subtotalAmount} {invoice.currency}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {invoice.totalAmount} {invoice.currency}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => downloadInvoice(invoice)}
                      disabled={downloadingId === invoice.id}
                    >
                      <Download className="h-4 w-4" />
                      {t('dashboard.invoices.download')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="pt-2" />
    </div>
  );
}
