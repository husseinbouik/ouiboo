'use client';

import { useTranslation } from 'react-i18next';
import { AuthShell, ResetPasswordForm } from '@ouiboo/auth';
import { AuthSideWordmark } from '../../components/AuthSideWordmark';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

/**
 * #1023 (D2): the split-screen shell and the reset-password form are
 * shared with traveler via `@ouiboo/auth`; this wrapper keeps only
 * the agency configuration (panel side, image, primary accent).
 */
export default function AgencyResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      panelSide="right"
      panelClassName="bg-primary"
      imageSrc="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=2070&auto=format&fit=crop"
      imageAlt={t('resetPassword.heroAlt')}
      imageOpacityClassName="opacity-40"
      wordmark={<AuthSideWordmark className="justify-end" />}
      sideTitle={t('resetPassword.sideTitle')}
      sideSubtitle={t('resetPassword.sideSubtitle')}
    >
      <ResetPasswordForm apiClient={apiClient} variant="primary" />
    </AuthShell>
  );
}
