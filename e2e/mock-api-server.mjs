/**
 * Mock API server for Playwright E2E tests.
 * Serves the same mock data as e2e/helpers.ts page.route mocks,
 * but at the HTTP level so Next.js SSR (server-side fetches) also get mocked data.
 *
 * Usage: node e2e/mock-api-server.mjs [port]
 * Defaults to port 3000.
 */

import { createServer } from 'node:http';

const PORT = parseInt(process.argv[2] || '3000', 10);

const TRIPS = [
  {
    id: 'trip-atlas-weekend',
    title: 'Atlas Weekend Escape',
    description: 'A weekend in the Atlas Mountains',
    price: 1200,
    currency: 'MAD',
    images: [],
    agency: { id: 'agency-1', name: 'Atlas Adventures', verificationStatus: 'VERIFIED' },
  },
];

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;
  const method = req.method;

  // Normalize: strip /api or /api/v1 prefix
  const path = pathname.replace(/^\/api(\/v1)?/, '') || '/';

  // --- Auth ---
  if (path === '/auth/register' && method === 'POST') {
    return json(res, 201, { email: 'traveler@example.com', requiresEmailVerification: true, message: 'Verification code sent' });
  }
  if (path === '/auth/verify-email' && method === 'POST') {
    return json(res, 201, { status: 'verified' });
  }
  if (path === '/auth/resend-otp' && method === 'POST') {
    return json(res, 201, { status: 'resent' });
  }
  if (path === '/auth/login' && method === 'POST') {
    return json(res, 200, { accessToken: 'mock-token', user: { id: 'user-1', role: 'TRAVELER' } });
  }

  // --- Trips (the critical one for SSR) ---
  if (path === '/trips' && method === 'GET') {
    return json(res, 200, {
      data: TRIPS,
      pagination: { total: TRIPS.length, page: 1, limit: 20, totalPages: 1 },
    });
  }
  if (path.startsWith('/trips/') && method === 'GET') {
    const trip = TRIPS.find(t => `/trips/${t.id}` === path) || TRIPS[0];
    return json(res, 200, { data: trip });
  }

  // --- Wallet (agency) ---
  if (path === '/agency/wallet' && method === 'GET') {
    return json(res, 200, { data: { balance: 5000, currency: 'MAD', payouts: [] } });
  }

  // --- Default: empty success for unmocked routes ---
  // This prevents SSR from crashing on unmocked endpoints
  if (method === 'GET') {
    return json(res, 200, { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  }
  return json(res, 200, { data: null });
});

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});
