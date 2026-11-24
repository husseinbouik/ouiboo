'use client';

import { useTranslation } from 'react-i18next';

export function SkipLink() {
  const { t } = useTranslation();
  // F1: this link now renders INSIDE <Providers>' I18nextProvider, whose
  // instance is initialised synchronously from the server-embedded
  // dictionary — translations are ready at the first render on the
  // server and the client alike, so the #245 mount gate that used to
  // hide the link until after mount is unnecessary: server and client
  // first renders are identical by construction (no hydration #418,
  // no raw keys per #122), and the link is present in the SSR HTML.
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-foreground focus:shadow-lg"
    >
      {t('common.skipToContent')}
    </a>
  );
}
