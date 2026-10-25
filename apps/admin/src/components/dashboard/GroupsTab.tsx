'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Users } from 'lucide-react';
import { Button, Card, Pagination } from '@ouiboo/ui';
import type { PaginationMeta } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import type { AdminPendingGroup, ApiErrorResponse } from './types';
import { formatDateTime } from './formatters';
import { getErrorMessage } from './dashboard-utils';
import AdminActionModal from './AdminActionModal';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type GroupsTabProps = {
  t: TFn;
  groups: AdminPendingGroup[];
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

type GroupAction = 'force-confirm-group' | 'close-group' | 'extend-deadline';

type PendingGroupAction = {
  group: AdminPendingGroup;
  action: GroupAction;
} | null;

const ACTION_TITLE_KEY: Record<GroupAction, string> = {
  'force-confirm-group': 'dashboard.groups.forceConfirmTitle',
  'close-group': 'dashboard.groups.closeTitle',
  'extend-deadline': 'dashboard.groups.extendTitle',
};

const ACTION_DESCRIPTION_KEY: Record<GroupAction, string> = {
  'force-confirm-group': 'dashboard.groups.forceConfirmDescription',
  'close-group': 'dashboard.groups.closeDescription',
  'extend-deadline': 'dashboard.groups.extendDescription',
};

const ACTION_BUTTON_KEY: Record<GroupAction, string> = {
  'force-confirm-group': 'dashboard.groups.actions.forceConfirm',
  'close-group': 'dashboard.groups.actions.closeGroup',
  'extend-deadline': 'dashboard.groups.actions.extendDeadline',
};

/**
 * #423: staged sessions stuck in PENDING_MINIMUM. Force-confirm ignores
 * the minimum and the deadline; close-group marks the group not
 * confirmed and creates the deposit refund cases immediately;
 * extend-deadline moves the session deadline and every plan snapshot.
 * Each action opens the shared reason modal and is audit-logged by the
 * API in the same transaction.
 */
export default function GroupsTab({ t, groups, pagination, onPageChange, paginationLabels }: GroupsTabProps) {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingGroupAction>(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const actionMutation = useMutation({
    mutationFn: async ({ group, action, reason }: { group: AdminPendingGroup; action: GroupAction; reason: string }) => {
      const body: Record<string, unknown> = { reason };
      if (action === 'extend-deadline') {
        if (!newDeadline) {
          throw new Error(t('dashboard.groups.newDeadlineRequired'));
        }
        body.newDeadline = new Date(newDeadline).toISOString();
      }
      await apiClient.post(`/admin/sessions/${group.sessionId}/${action}`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-groups'] });
      setPendingAction(null);
      setModalError(null);
      setFeedback(t('dashboard.groups.success'));
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setModalError(getErrorMessage(error, t('dashboard.interventions.failed')));
    },
  });

  const openAction = (group: AdminPendingGroup, action: GroupAction) => {
    setModalError(null);
    setFeedback(null);
    setNewDeadline('');
    setPendingAction({ group, action });
  };

  if (groups.length === 0) {
    return (
      <Card className="p-10 text-center space-y-3">
        <Users className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="font-semibold">{t('dashboard.groups.empty')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.groups.emptyHint')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && <div className="text-sm font-medium text-success">{feedback}</div>}
      {groups.map((group) => {
        const belowMinimum = group.paidParticipants < group.minBookings;
        return (
          <Card key={group.sessionId} className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{group.tripTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {group.agencyName || ''} · {t('dashboard.groups.starts')}: {formatDateTime(group.startDate, t)}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${belowMinimum ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
                {t('dashboard.groups.paidOfMin', { paid: group.paidParticipants, min: group.minBookings })}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                {t('dashboard.groups.deadline')}: {formatDateTime(group.confirmationDeadline, t)}
              </span>
              <span>{t('dashboard.groups.depositPaidBookings', { count: group.depositPaidBookings })}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={actionMutation.isPending} onClick={() => openAction(group, 'force-confirm-group')}>
                {t('dashboard.groups.actions.forceConfirm')}
              </Button>
              <Button size="sm" variant="outline" disabled={actionMutation.isPending} onClick={() => openAction(group, 'extend-deadline')}>
                {t('dashboard.groups.actions.extendDeadline')}
              </Button>
              <Button size="sm" variant="outline" disabled={actionMutation.isPending} onClick={() => openAction(group, 'close-group')}>
                {t('dashboard.groups.actions.closeGroup')}
              </Button>
            </div>
          </Card>
        );
      })}
      <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} />

      {pendingAction && (
        <AdminActionModal
          t={t}
          title={t(ACTION_TITLE_KEY[pendingAction.action])}
          description={t(ACTION_DESCRIPTION_KEY[pendingAction.action])}
          confirmLabel={t(ACTION_BUTTON_KEY[pendingAction.action])}
          destructive={pendingAction.action !== 'extend-deadline'}
          pending={actionMutation.isPending}
          error={modalError}
          onClose={() => setPendingAction(null)}
          onSubmit={(reason) => actionMutation.mutate({ group: pendingAction.group, action: pendingAction.action, reason })}
        >
          {pendingAction.action === 'extend-deadline' && (
            <div className="space-y-2">
              <label
                htmlFor="group-new-deadline"
                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('dashboard.groups.newDeadline')}
              </label>
              <input
                id="group-new-deadline"
                type="datetime-local"
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
              />
            </div>
          )}
        </AdminActionModal>
      )}
    </div>
  );
}
