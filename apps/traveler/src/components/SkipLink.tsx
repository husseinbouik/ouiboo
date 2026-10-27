'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// #336: this link renders OUTSIDE <Providers> (the layout places it before
// them), and React requires client-component modules lazily in render
// order — so SkipLink can be the first component to run useTranslation,
// before the Providers module (the usual importer of this side effect) has
// been required at all. That is the NO_I18NEXT_INSTANCE console warning
// the traveler-console e2e gate caught on /, /search and authenticated
// reloads. Importing the initializer here (the same pattern as
// TripContactsCard and every standalone client page) makes this module's
// own import chain initialise i18next before the hook runs.
import '../lib/i18n';

export function SkipLink() {
  const { t, ready } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Mount gate (#245): this link renders OUTSIDE <Providers>, so the
  // providers' i18n-ready gate cannot protect it. Translations load over
  // HTTP, so during SSR `ready` is always false and the server renders
  // nothing here; on the client the translation load can finish before
  // React hydrates, making the first client render include an anchor the
  // server never sent — React hydration error #418 (text), caught by the
  // production smoke suite. Rendering only after mount keeps the first
  // client render identical to the server output in every environment.
  if (!mounted || !ready) return null;
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-foreground focus:shadow-lg"
    >
      {t('common.skipToContent')}
    </a>
  );
}
