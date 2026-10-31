/*
 * #690 (Council S6): Ouiboo traveller service worker.
 *
 * Auth-aware caching rules (hard):
 * - API requests are NEVER cached. Authenticated responses (bookings,
 *   passes, proofs) must not outlive the session in a shared cache.
 *   The one offline artefact is the Booking Pass, which the booking
 *   page itself persists on-device (localStorage) once loaded — the
 *   service worker deliberately does not duplicate that store.
 * - Cross-origin requests are never intercepted.
 * - Navigations: network first, falling back to the cached app shell
 *   pages the visitor already loaded (so a loaded booking page still
 *   opens offline and its on-device pass artefact can render).
 * - Static assets (/_next/static, /locales, icons, manifest):
 *   stale-while-revalidate.
 */
const SW_VERSION = 'ouiboo-sw-v1';
const STATIC_CACHE = `${SW_VERSION}-static`;
const PAGE_CACHE = `${SW_VERSION}-pages`;

const STATIC_PATH_PREFIXES = ['/_next/static/', '/locales/', '/icons/'];
const STATIC_PATHS = new Set(['/manifest.webmanifest', '/icon.png', '/favicon.ico']);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.startsWith(SW_VERSION)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache or replay API traffic (authenticated or not).
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const bookings = await caches.match('/bookings', { ignoreSearch: true });
          if (bookings) return bookings;
          throw new Error('offline and no cached page');
        }
      })(),
    );
    return;
  }

  if (STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || STATIC_PATHS.has(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});

// Logout / account switch: the app posts { type: 'ouiboo:clear-caches' }
// so no page or static entry from a previous session lingers.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ouiboo:clear-caches') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      })(),
    );
  }
});
