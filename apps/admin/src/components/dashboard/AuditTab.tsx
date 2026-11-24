'use client';

import React from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import { Button, Card, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@ouiboo/ui';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminAuditLog, FeedbackState } from './types';
import { formatDateTime, renderAuditMetadata } from './formatters';
import { getAdminAuditActionLabel } from '../../app/status-mappers';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type AuditTabProps = {
  t: TFn;
  logs: AdminAuditLog[];
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
  auditFeedback: FeedbackState | null;
  retentionDays: string;
  onRetentionDaysChange: (value: string) => void;
  isExporting: boolean;
  isPruning: boolean;
  onExportAuditLogs: () => void;
  onPruneAuditLogs: () => void;
};

export default function AuditTab({
  t,
  logs,
  pagination,
  onPageChange,
  paginationLabels,
  auditFeedback,
  retentionDays,
  onRetentionDaysChange,
  isExporting,
  isPruning,
  onExportAuditLogs,
  onPruneAuditLogs,
}: AuditTabProps) {
  return (
<div className="space-y-6 animate-in fade-in duration-500">
  <div className="flex items-center justify-between gap-4">
    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
      <FileText className="h-5 w-5 text-sunset-orange" />
      {t('dashboard.audit.trail', { total: pagination?.total ?? logs.length })}
    </h2>
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="border-border"
        onClick={onExportAuditLogs}
        disabled={isExporting}
      >
        <Download className="h-4 w-4 ms-2" />
        {isExporting ? t('dashboard.audit.exporting') : t('dashboard.audit.exportCsv')}
      </Button>
    </div>
  </div>

  {auditFeedback && (
    <div className={`animate-in fade-in slide-in-from-top-1 duration-150 text-sm font-medium ${auditFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
      {auditFeedback.message}
    </div>
  )}

  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
    <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
      {logs.length ? (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t('dashboard.table.when')}</TableHead>
              <TableHead scope="col">{t('dashboard.table.actor')}</TableHead>
              <TableHead scope="col">{t('dashboard.table.action')}</TableHead>
              <TableHead scope="col">{t('dashboard.table.target')}</TableHead>
              <TableHead scope="col">{t('dashboard.table.metadata')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="align-top">
                <TableCell className="text-sm text-muted-foreground align-top">
                  <p className="font-medium text-foreground">{formatDateTime(log.createdAt, t)}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">#{log.id.slice(0, 8)}</p>
                </TableCell>
                <TableCell className="text-sm align-top">
                  <p className="font-medium text-foreground">{log.actorEmail || t('dashboard.labels.system')}</p>
                  <p className="text-muted-foreground">{log.actorId || t('dashboard.labels.noActorId')}</p>
                </TableCell>
                <TableCell className="text-sm font-semibold text-foreground align-top">
                  {getAdminAuditActionLabel(log.action, t)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground align-top">
                  <p className="font-medium text-foreground">{log.targetType}</p>
                  <p>{log.targetId || t('dashboard.labels.noTargetId')}</p>
                </TableCell>
                <TableCell className="align-top">
                  {renderAuditMetadata(log.metadata, t)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {t('dashboard.audit.noResults')}
        </div>
      )}
    </div>

    <Card className="border-none shadow-sm p-6 bg-card h-fit">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">{t('dashboard.audit.retentionAndExport')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('dashboard.audit.retentionHint')}
          </p>
        </div>

        <div className="rounded-2xl bg-muted p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('dashboard.audit.currentWindow')}</p>
          <p className="text-sm text-foreground">
            {t('dashboard.audit.showingEvents', {
              total: pagination?.total ?? logs.length,
              page: pagination?.page ?? 1,
              totalPages: pagination?.totalPages ?? 1,
            })}
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard.audit.retentionDays')}
          </label>
          <input
            type="number"
            min={1}
            value={retentionDays}
            onChange={(event) => onRetentionDaysChange(event.target.value)}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
          />
          <p className="text-sm text-muted-foreground">
            {t('dashboard.audit.pruneHint')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-deep-blue hover:bg-deep-blue/90 text-white border-none"
            onClick={onExportAuditLogs}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 ms-2" />
            {isExporting ? t('dashboard.audit.exporting') : t('dashboard.audit.downloadCsv')}
          </Button>
          <Button
            className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
            onClick={onPruneAuditLogs}
            disabled={isPruning}
          >
            <Trash2 className="h-4 w-4 ms-2" />
            {isPruning ? t('dashboard.audit.pruning') : t('dashboard.audit.pruneOldLogs')}
          </Button>
        </div>
      </div>
    </Card>
  </div>
  <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
</div>
  );
}
