'use client';

import { useTranslation } from 'react-i18next';
import { AuthShell, ForgotPasswordForm } from '@ouiboo/auth';
import { AuthSideWordmark } from '../../components/AuthSideWordmark';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

/**
 * #1023 (D2): the split-screen shell and the forgot-password form are
 * shared with traveler via `@ouiboo/auth`; this wrapper keeps only
 * the agency configuration (panel side, image, primary accent).
 */
export default function AgencyForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      panelSide="right"
      panelClassName="bg-primary"
      imageSrc="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=2070&auto=format&fit=crop"
      imageAlt={t('forgotPassword.heroAlt')}
      imageOpacityClassName="opacity-40"
      wordmark={<AuthSideWordmark className="justify-end" />}
      sideTitle={t('forgotPassword.sideTitle')}
      sideSubtitle={t('forgotPassword.sideSubtitle')}
    >
      <ForgotPasswordForm apiClient={apiClient} variant="primary" />
    </AuthShell>
  );
}
