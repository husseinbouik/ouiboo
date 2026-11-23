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
 *   Only 200 responses are cached (#864): the proxy 307s signed-out
 *   visits to /login, and caching that redirect meant a later offline
 *   load of the same route replayed the 307 and walled a signed-in
 *   user out. A redirect is never a usable offline shell.
 * - Static assets (/_next/static, icons, manifest):
 *   stale-while-revalidate. Their URLs are content-hashed or fixed, so
 *   a cached copy can never be a DIFFERENT build's content.
 * - Locale bundles (/locales/*.json): NETWORK FIRST, cache only as an
 *   offline fallback. #975: under stale-while-revalidate, the first
 *   load after any deploy that adds translation keys rendered the
 *   PREVIOUS bundle for the whole session — i18next loads the bundle
 *   once per page load and the missing-key handler returns the raw
 *   key, so a returning phone showed literal strings like
 *   "search.stateTrips" until a second reload (founder screenshot
 *   2026-11-12; reproduced with a seeded stale cache). Network-first
 *   makes the first post-deploy load render the fresh bundle. The v4
 *   bump also purges every v3 cache on activate, clearing the stale
 *   bundles already sitting on returning devices.
 */
const SW_VERSION = 'ouiboo-sw-v4';
const STATIC_CACHE = `${SW_VERSION}-static`;
const PAGE_CACHE = `${SW_VERSION}-pages`;

const LOCALE_PATH_PREFIX = '/locales/';
const STATIC_PATH_PREFIXES = ['/_next/static/', '/icons/'];
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
          // #864: cache only a 200 document. Navigation requests carry
          // redirect:'manual', so a proxy 307 arrives here as an
          // opaqueredirect — cache.put would store it and the offline
          // fallback would replay the sign-in redirect for a signed-in
          // user. Non-200s are returned, never stored.
          if (response.status === 200) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, response.clone());
          }
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

  if (url.pathname.startsWith(LOCALE_PATH_PREFIX)) {
    // #975: network first (see header). The cache is written on every
    // successful fetch and read ONLY when the network fails, so an
    // offline revisit still renders the last-seen language.
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error('offline and no cached locale bundle');
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
            // Same rule as navigations (#864): only a 200 is stored,
            // so a 404/redirect can never poison the static cache.
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});

// #784: web push. The API sends a JSON payload { title, body, url }
// after the same preference checks that gate email — the worker only
// renders it. Payloads are never cached or persisted.
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json() || {};
    } catch {
      payload = { body: event.data.text() };
    }
  }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Ouiboo';
  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: {
      url: typeof payload.url === 'string' && payload.url ? payload.url : '/notifications',
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(
    (async () => {
      const targetUrl = new URL(target, self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            await client.navigate(targetUrl).catch(() => undefined);
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })(),
  );
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
