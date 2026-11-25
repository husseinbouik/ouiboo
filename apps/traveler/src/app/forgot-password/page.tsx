'use client';

import { useTranslation } from 'react-i18next';
import { AuthShell, ForgotPasswordForm } from '@ouiboo/auth';
import { AuthSideWordmark } from '../../components/AuthSideWordmark';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

/**
 * #1023 (D2): the split-screen shell and the forgot-password form are
 * shared with agency via `@ouiboo/auth`; this wrapper keeps only the
 * traveler configuration (panel side, image, sunset accent).
 */
export default function TravelerForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      panelSide="left"
      panelClassName="bg-deep-blue"
      imageSrc="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2070&auto=format&fit=crop"
      imageAlt="Quiet travel planning"
      imageOpacityClassName="opacity-60"
      wordmark={<AuthSideWordmark />}
      sideTitle={t('forgotPassword.sideTitle')}
      sideSubtitle={t('forgotPassword.sideSubtitle')}
    >
      <ForgotPasswordForm apiClient={apiClient} variant="sunset" />
    </AuthShell>
  );
}
