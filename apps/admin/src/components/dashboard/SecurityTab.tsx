'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { KeyRound, ShieldCheck, ShieldAlert, Copy, Download, Ban } from 'lucide-react';
import { Button, Card, Input } from '@ouiboo/ui';
import QRCode from 'qrcode';
import { apiClient } from '@/lib/api-client';
import type { AdminBreakGlassCredential, AdminMfaStatus, ApiErrorResponse } from './types';
import { formatDateTime } from './formatters';
import { getErrorMessage } from './dashboard-utils';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type SecurityTabProps = {
  t: TFn;
};

type EnrollmentState = {
  otpauthUrl: string;
  secret: string;
} | null;

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * #418 (Council P0-13): admin identity hardening UI.
 *
 * - TOTP MFA enrolment wizard: password re-entry → QR/manual secret →
 *   confirm code → one-time recovery codes shown exactly once.
 * - Break-glass credentials: the SEPARATE recovery path. A credential is a
 *   one-time secret (shown once, stored offline by the founder) that —
 *   together with the admin password — signs in without the TOTP factor.
 *   Every creation/revocation/use is audit-logged by the API.
 */
export default function SecurityTab({ t }: SecurityTabProps) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Enrolment wizard state
  const [enrollPassword, setEnrollPassword] = useState('');
  const [enrollment, setEnrollment] = useState<EnrollmentState>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [reEnrolling, setReEnrolling] = useState(false);

  // Break-glass creation state
  const [bgLabel, setBgLabel] = useState('');
  const [bgPassword, setBgPassword] = useState('');
  const [bgDays, setBgDays] = useState('90');
  const [newBgSecret, setNewBgSecret] = useState<{ label: string; secret: string; expiresAt: string } | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['admin', 'mfa-status'],
    queryFn: async () => {
      const response = await apiClient.get<AdminMfaStatus>('/auth/mfa/status');
      return response.data;
    },
  });

  const credentialsQuery = useQuery({
    queryKey: ['admin', 'break-glass-credentials'],
    queryFn: async () => {
      const response = await apiClient.get<AdminBreakGlassCredential[]>('/auth/break-glass/credentials');
      return response.data;
    },
  });

  useEffect(() => {
    if (!enrollment?.otpauthUrl) return;
    let cancelled = false;
    QRCode.toDataURL(enrollment.otpauthUrl, { width: 200, margin: 1 })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [enrollment]);

  const startEnrollmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/mfa/enrollment/start', { password: enrollPassword });
      return response.data as { otpauthUrl: string; secret: string };
    },
    onSuccess: (data) => {
      setFeedback(null);
      setQrDataUrl(null);
      setEnrollment({ otpauthUrl: data.otpauthUrl, secret: data.secret });
      setEnrollCode('');
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, t('security.enrollStartFailed')) });
    },
  });

  const confirmEnrollmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/mfa/enrollment/confirm', { code: enrollCode.trim() });
      return response.data as { recoveryCodes: string[] };
    },
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setEnrollment(null);
      setEnrollPassword('');
      setReEnrolling(false);
      setFeedback({ type: 'success', message: t('security.enrollSuccess') });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'mfa-status'] });
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, t('security.enrollConfirmFailed')) });
    },
  });

  const createCredentialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/break-glass/credentials', {
        label: bgLabel.trim(),
        password: bgPassword,
        expiresInDays: Number(bgDays) || 90,
      });
      return response.data as { label: string; secret: string; expiresAt: string };
    },
    onSuccess: (data) => {
      setNewBgSecret({ label: data.label, secret: data.secret, expiresAt: data.expiresAt });
      setBgLabel('');
      setBgPassword('');
      setFeedback({ type: 'success', message: t('security.breakGlassCreated') });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'break-glass-credentials'] });
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, t('security.breakGlassCreateFailed')) });
    },
  });

  const revokeCredentialMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/auth/break-glass/credentials/${id}`);
    },
    onSuccess: () => {
      setRevokeConfirmId(null);
      setFeedback({ type: 'success', message: t('security.breakGlassRevoked') });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'break-glass-credentials'] });
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, t('security.breakGlassRevokeFailed')) });
    },
  });

  const status = statusQuery.data;
  const showWizard = status && (!status.mfaEnabled || reEnrolling) && !recoveryCodes;
  const credentials = credentialsQuery.data ?? [];

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'success'
            ? 'border-success/20 bg-success/10 text-success'
            : 'border-danger/20 bg-danger/10 text-danger'}`}
        >
          {feedback.message}
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-deep-blue" />
          <h2 className="text-lg font-black">{t('security.mfaTitle')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('security.mfaDescription')}</p>

        {statusQuery.isLoading && <p className="text-sm text-muted-foreground">{t('security.loading')}</p>}

        {status && status.mfaEnabled && !reEnrolling && !recoveryCodes && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <span><strong>{t('security.statusLabel')}:</strong> {t('security.statusEnabled')}</span>
              {status.mfaEnrolledAt && (
                <span><strong>{t('security.enrolledAt')}:</strong> {formatDateTime(status.mfaEnrolledAt, t)}</span>
              )}
              <span><strong>{t('security.recoveryRemaining')}:</strong> {status.recoveryCodesRemaining}</span>
            </div>
            {status.recoveryCodesRemaining === 0 && (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                {t('security.noRecoveryCodesWarning')}
              </div>
            )}
            <Button type="button" variant="outline" onClick={() => { setReEnrolling(true); setFeedback(null); }}>
              {t('security.reEnroll')}
            </Button>
          </div>
        )}

        {showWizard && (
          <div className="space-y-4">
            {!enrollment ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 space-y-2">
                  <label htmlFor="enroll-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t('security.currentPassword')}
                  </label>
                  <Input
                    id="enroll-password"
                    type="password"
                    value={enrollPassword}
                    onChange={(e) => setEnrollPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="button"
                  disabled={!enrollPassword || startEnrollmentMutation.isPending}
                  onClick={() => startEnrollmentMutation.mutate()}
                >
                  {t('security.startEnrollment')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <ol className="list-decimal ms-5 space-y-1 text-sm text-muted-foreground">
                  <li>{t('security.stepScan')}</li>
                  <li>{t('security.stepConfirm')}</li>
                </ol>
                <div className="flex flex-col sm:flex-row gap-6">
                  {qrDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt={t('security.qrAlt')} width={200} height={200} className="rounded-xl border border-border bg-white p-1" />
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('security.manualSecret')}</p>
                    <code className="block break-all rounded-xl bg-muted px-3 py-2 text-sm">{enrollment.secret}</code>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="enroll-code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {t('security.confirmCode')}
                    </label>
                    <Input
                      id="enroll-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={enrollCode.length !== 6 || confirmEnrollmentMutation.isPending}
                    onClick={() => confirmEnrollmentMutation.mutate()}
                  >
                    {t('security.confirmEnrollment')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {recoveryCodes && (
          <div className="space-y-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-4">
            <p className="text-sm font-bold">{t('security.recoveryCodesTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('security.recoveryCodesWarning')}</p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-sm">
              {recoveryCodes.map((code) => (
                <li key={code} className="rounded-lg bg-background px-3 py-2 text-center">{code}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}
              >
                <Copy className="h-4 w-4 me-2" /> {t('security.copyCodes')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadTextFile('ouiboo-recovery-codes.txt', recoveryCodes.join('\n'))}
              >
                <Download className="h-4 w-4 me-2" /> {t('security.downloadCodes')}
              </Button>
              <Button type="button" onClick={() => setRecoveryCodes(null)}>
                {t('security.codesSaved')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-deep-blue" />
          <h2 className="text-lg font-black">{t('security.breakGlassTitle')}</h2>
        </div>
        <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning-foreground" />
          <p>{t('security.breakGlassDescription')}</p>
        </div>

        {newBgSecret && (
          <div className="space-y-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-4">
            <p className="text-sm font-bold">{t('security.breakGlassSecretTitle', { label: newBgSecret.label })}</p>
            <code className="block break-all rounded-xl bg-background px-3 py-2 font-mono text-base">{newBgSecret.secret}</code>
            <p className="text-sm text-muted-foreground">
              {t('security.breakGlassSecretWarning', { expiresAt: formatDateTime(newBgSecret.expiresAt, t) })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(newBgSecret.secret)}>
                <Copy className="h-4 w-4 me-2" /> {t('security.copySecret')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadTextFile('ouiboo-break-glass.txt', `${newBgSecret.label}\n${newBgSecret.secret}\n`)}
              >
                <Download className="h-4 w-4 me-2" /> {t('security.downloadSecret')}
              </Button>
              <Button type="button" onClick={() => setNewBgSecret(null)}>
                {t('security.codesSaved')}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_auto] gap-3 items-end">
          <div className="space-y-2">
            <label htmlFor="bg-label" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('security.breakGlassLabel')}
            </label>
            <Input
              id="bg-label"
              value={bgLabel}
              onChange={(e) => setBgLabel(e.target.value)}
              placeholder={t('security.breakGlassLabelPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bg-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('security.currentPassword')}
            </label>
            <Input
              id="bg-password"
              type="password"
              value={bgPassword}
              onChange={(e) => setBgPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bg-days" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('security.breakGlassDays')}
            </label>
            <Input
              id="bg-days"
              type="number"
              min={1}
              max={365}
              value={bgDays}
              onChange={(e) => setBgDays(e.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={!bgLabel.trim() || !bgPassword || createCredentialMutation.isPending}
            onClick={() => createCredentialMutation.mutate()}
          >
            {t('security.createBreakGlass')}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pe-4">{t('security.colLabel')}</th>
                <th className="py-2 pe-4">{t('security.colStatus')}</th>
                <th className="py-2 pe-4">{t('security.colCreated')}</th>
                <th className="py-2 pe-4">{t('security.colExpires')}</th>
                <th className="py-2">{t('security.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((credential) => (
                <tr key={credential.id} className="border-t border-border">
                  <td className="py-2 pe-4 font-medium">{credential.label}</td>
                  <td className="py-2 pe-4">
                    {t(`security.status.${credential.status.toLowerCase()}`)}
                    {credential.usedByEmail && (
                      <span className="block text-xs text-muted-foreground">{credential.usedByEmail}</span>
                    )}
                  </td>
                  <td className="py-2 pe-4">{formatDateTime(credential.createdAt, t)}</td>
                  <td className="py-2 pe-4">{formatDateTime(credential.expiresAt, t)}</td>
                  <td className="py-2">
                    {credential.status === 'ACTIVE' && (
                      revokeConfirmId === credential.id ? (
                        <span className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={revokeCredentialMutation.isPending}
                            onClick={() => revokeCredentialMutation.mutate(credential.id)}
                          >
                            {t('security.confirmRevoke')}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setRevokeConfirmId(null)}>
                            {t('security.cancel')}
                          </Button>
                        </span>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => setRevokeConfirmId(credential.id)}>
                          <Ban className="h-4 w-4 me-1" /> {t('security.revoke')}
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {credentials.length === 0 && !credentialsQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    {t('security.noBreakGlass')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
