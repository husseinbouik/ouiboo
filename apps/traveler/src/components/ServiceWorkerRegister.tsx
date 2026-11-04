'use client';

import { useEffect } from 'react';

/**
 * #690 (Council S6): registers the traveller service worker (PWA).
 * Registration is best-effort — the app works identically without it;
 * the worker only adds installability and offline shell/pass access.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Unsupported or blocked: no offline mode, no error surface.
    });
  }, []);
  return null;
}

/**
 * #690: cache invalidation on logout — page/static caches are cleared
 * and every on-device Booking Pass artefact is dropped, so a signed-out
 * device keeps no authenticated residue.
 */
export function clearPwaCachesOnLogout() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('ouiboo-booking-pass:')) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing persisted to clear.
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.active?.postMessage({ type: 'ouiboo:clear-caches' });
    }).catch(() => undefined);
  }
}
