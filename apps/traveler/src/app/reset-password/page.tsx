'use client';

import { useTranslation } from 'react-i18next';
import { AuthShell, ResetPasswordForm } from '@ouiboo/auth';
import { AuthSideWordmark } from '../../components/AuthSideWordmark';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

/**
 * #1023 (D2): the split-screen shell and the reset-password form are
 * shared with agency via `@ouiboo/auth`; this wrapper keeps only the
 * traveler configuration (panel side, image, sunset accent). The
 * side copy keeps traveler's historical English fallbacks.
 */
export default function TravelerResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      panelSide="left"
      panelClassName="bg-deep-blue"
      imageSrc="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2070&auto=format&fit=crop"
      imageAlt="Quiet travel planning"
      imageOpacityClassName="opacity-60"
      wordmark={<AuthSideWordmark />}
      sideTitle={t('resetPassword.sideTitle', 'Get back to planning')}
      sideSubtitle={t('resetPassword.sideSubtitle', 'Update your password and return to your travel dashboard in minutes.')}
    >
      <ResetPasswordForm apiClient={apiClient} variant="sunset" />
    </AuthShell>
  );
}
