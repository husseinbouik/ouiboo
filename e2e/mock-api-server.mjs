/**
 * Mock API server for Playwright E2E tests.
 * Serves the same mock data as e2e/helpers.ts page.route mocks,
 * but at the HTTP level so Next.js SSR (server-side fetches) also get mocked data.
 *
 * IMPORTANT: response shapes must match e2e/helpers.ts exactly, because SSR
 * and client-side fetches for the same endpoint must return identical shapes.
 *
 * Usage: node e2e/mock-api-server.mjs [port]
 * Defaults to port 3000.
 */

import { createServer } from 'node:http';

const PORT = parseInt(process.argv[2] || '3000', 10);

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// The api client sends withCredentials: true, so we must echo the exact request
// Origin (browsers reject '*' for credentialed requests) and allow credentials.
const corsHeaders = (req) => {
  const origin = req.headers.origin || '*';
  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Mirrors the trip in e2e/helpers.ts mockTravelerApi (id 'trip-1').
const TRIP_1 = {
  id: 'trip-1',
  title: 'Atlas Weekend Escape',
  category: 'Adventure',
  startLocation: 'Marrakech',
  durationDays: 3,
  durationNights: 2,
  description: 'A guided mountain escape for launch testing.',
  images: [
    'https://example.com/trip-1.jpg',
    'https://example.com/trip-2.jpg',
  ],
  inclusions: ['Guide', 'Transport'],
  exclusions: ['Flights'],
  checklist: ['Passport'],
  agency: {
    id: 'agency-1',
    companyName: 'Atlas Co',
    bankDetails: 'RIB 1234567890',
    verificationStatus: 'VERIFIED',
  },
  sessions: [
    {
      id: 'session-1',
      status: 'OPEN',
      availableSeats: 8,
      price: 1800,
      deposit: 400,
      startDate: '2027-05-10T00:00:00.000Z',
      endDate: '2027-05-12T00:00:00.000Z',
    },
  ],
};

const json = (req, res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(req) });
  res.end(JSON.stringify(data));
};

const paginated = (items, url) => ({
  data: items,
  pagination: {
    total: items.length,
    page: Number(url.searchParams.get('page') || 1),
    limit: 20,
    totalPages: items.length > 0 ? 1 : 0,
  },
});

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;
  const method = req.method;

  // Preflight: allow everything (tests only). Echo the requested headers
  // explicitly — for credentialed requests Chromium rejects a wildcard
  // Access-Control-Allow-Headers, which blocked real POSTs (e.g. booking
  // creation) from browsers that are not shielded by Playwright's
  // page.route interception (#332 walkthrough found this).
  if (method === 'OPTIONS') {
    const headers = { ...corsHeaders(req) };
    const requested = req.headers['access-control-request-headers'];
    if (requested) headers['Access-Control-Allow-Headers'] = requested;
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // Normalize: strip /api or /api/v1 prefix
  const path = pathname.replace(/^\/api(\/v1)?/, '') || '/';

  // --- Auth ---
  if (path === '/auth/register' && method === 'POST') {
    return json(req, res, 201, { email: 'traveler@example.com', requiresEmailVerification: true, message: 'Verification code sent' });
  }
  if (path === '/auth/verify-email' && method === 'POST') {
    return json(req, res, 201, { status: 'verified' });
  }
  if (path === '/auth/resend-otp' && method === 'POST') {
    return json(req, res, 201, { status: 'resent' });
  }
  if (path === '/auth/login' && method === 'POST') {
    return json(req, res, 201, { accessToken: 'mock-token', refreshToken: 'mock-refresh' });
  }
  if (path === '/auth/refresh' && method === 'POST') {
    return json(req, res, 201, { accessToken: 'mock-token', refreshToken: 'mock-refresh' });
  }

  // --- Users ---
  if (path === '/users/me' && method === 'GET') {
    // Generic shape; page.route mocks override per-app with role-specific data.
    return json(req, res, 200, { id: 'user-1', name: 'Test User', email: 'user@example.com', role: 'TRAVELER' });
  }
  if (path === '/users/wishlist/count' && method === 'GET') {
    return json(req, res, 200, { count: 1 });
  }

  // --- Trips (critical for SSR) ---
  if (path === '/trips' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const category = url.searchParams.get('category');
    const agencyId = url.searchParams.get('agencyId');
    const matchesSearch = !q || 'atlas weekend escape'.includes(q) || 'marrakech'.includes(q);
    const matchesCategory = !category || category.toLowerCase() === 'adventure';
    const matchesAgency = !agencyId || agencyId === 'agency-1';
    const trips = matchesSearch && matchesCategory && matchesAgency ? [TRIP_1] : [];
    return json(req, res, 200, paginated(trips, url));
  }
  // NOTE: single-trip endpoint returns the trip object directly (NOT wrapped in
  // { data }), matching e2e/helpers.ts and what the trip page expects.
  if (path === '/trips/trip-1' && method === 'GET') {
    return json(req, res, 200, TRIP_1);
  }
  if (path === '/trips/trip-1/reviews/stats' && method === 'GET') {
    return json(req, res, 200, { averageRating: 4.8, totalReviews: 12, distribution: { 5: 8, 4: 4, 3: 0, 2: 0, 1: 0 } });
  }
  if (path === '/trips/trip-1/reviews' && method === 'GET') {
    return json(req, res, 200, { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  }
  if (path === '/agencies/agency-1/public' && method === 'GET') {
    return json(req, res, 200, {
      id: 'agency-1',
      companyName: 'Atlas Agency',
      bio: 'Trusted mountain escapes across Morocco.',
      logo: null,
      verificationStatus: 'VERIFIED',
    });
  }

  // --- Bookings (traveler) ---
  if (path === '/bookings' && method === 'POST') {
    return json(req, res, 201, { id: 'booking-1' });
  }
  if (path === '/bookings/booking-1' && method === 'GET') {
    return json(req, res, 200, {
      id: 'booking-1',
      status: 'AWAITING_VALIDATION',
      paymentStatus: 'UNPAID',
      paymentMethod: 'BANK_TRANSFER',
      paymentProof: true,
      confirmedAt: null,
      cancelledAt: null,
      refundStatus: null,
      totalAmount: 3600,
      guestsCount: 2,
      fullName: 'Launch Traveler',
      phoneNumber: '+212600000000',
      traveler: { id: 'traveler-1', name: 'Launch Traveler', email: 'traveler@example.com' },
      session: {
        id: 'session-1',
        startDate: '2027-05-10T00:00:00.000Z',
        endDate: '2027-05-12T00:00:00.000Z',
        template: { id: 'trip-1', title: 'Atlas Weekend Escape' },
      },
    });
  }
  if (path === '/bookings/booking-1/payment-proof' && method === 'POST') {
    return json(req, res, 201, { ok: true });
  }
  if (path === '/reviews' && method === 'POST') {
    return json(req, res, 201, { id: 'review-1' });
  }

  // --- Agency ---
  if (path === '/agency/stats' && method === 'GET') {
    return json(req, res, 200, {
      revenue: 12000,
      totalBookings: 14,
      activeTrips: 3,
      totalCustomers: 9,
      payments: {
        currency: 'MAD',
        totalReceived: '1800.00',
        totalRefunded: '0.00',
        pendingVerificationCount: 0,
        pendingVerificationAmount: '0.00',
      },
    });
  }
  if (path === '/agency/payments/overview' && method === 'GET') {
    return json(req, res, 200, {
      currency: 'MAD',
      totalReceived: '1800.00',
      totalRefunded: '0.00',
      pendingVerificationCount: 0,
      pendingVerificationAmount: '0.00',
    });
  }
  if (path === '/agency/payments' && method === 'GET') {
    return json(req, res, 200, {
      data: [
        {
          id: 'ext-payment-1',
          bookingId: 'booking-1',
          amount: '1800.00',
          currency: 'MAD',
          method: 'MANUAL',
          provider: null,
          status: 'VERIFIED',
          custodian: 'AGENCY',
          verifiedAt: '2026-04-22T10:00:00.000Z',
          createdAt: '2026-04-22T10:00:00.000Z',
          updatedAt: '2026-04-22T10:00:00.000Z',
          booking: {
            id: 'booking-1',
            guestsCount: 1,
            traveler: { name: 'Launch Traveler', email: 'traveler@example.com' },
            session: {
              startDate: '2026-05-10T00:00:00.000Z',
              template: { title: 'Atlas Weekend Escape' },
            },
          },
        },
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  }
  if (path === '/agency/bookings' && method === 'GET') {
    return json(req, res, 200, [
      {
        id: 'booking-1',
        bookingDate: '2026-04-22T10:00:00.000Z',
        status: 'AWAITING_VALIDATION',
        paymentStatus: 'UNPAID',
        paymentMethod: 'MANUAL',
        totalAmount: 1800,
        guestsCount: 1,
        fullName: 'Launch Traveler',
        traveler: { id: 'traveler-1', name: 'Launch Traveler', email: 'traveler@example.com' },
        session: {
          id: 'session-1',
          startDate: '2026-05-10T00:00:00.000Z',
          endDate: '2026-05-12T00:00:00.000Z',
          template: { id: 'trip-1', title: 'Atlas Weekend Escape' },
        },
        paymentProof: { id: 'proof-1', imageUrl: 'proof-1.png', status: 'PENDING' },
      },
    ]);
  }

  // --- Admin ---
  if (path === '/admin/pending-agencies' && method === 'GET') {
    return json(req, res, 200, { data: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } });
  }
  if (path === '/admin/pending-trips' && method === 'GET') {
    return json(req, res, 200, { data: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } });
  }
  if (path === '/admin/agencies' && method === 'GET') {
    return json(req, res, 200, { data: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } });
  }
  if (path === '/admin/bookings' && method === 'GET') {
    return json(req, res, 200, {
      data: [
        {
          id: 'booking-1',
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentMethod: 'GATEWAY',
          paymentGatewayTransactionId: 'txn-1',
          totalAmount: 1800,
          guestsCount: 1,
          traveler: { id: 'traveler-1', name: 'Launch Traveler', email: 'traveler@example.com' },
          session: {
            id: 'session-1',
            startDate: '2026-05-10T00:00:00.000Z',
            endDate: '2026-05-12T00:00:00.000Z',
            template: {
              id: 'trip-1',
              title: 'Atlas Weekend Escape',
              agency: { id: 'agency-1', companyName: 'Atlas Agency' },
            },
          },
        },
      ],
      pagination: { total: 1, page: 1, limit: 25, totalPages: 1 },
    });
  }
  if (path === '/admin/pending-payments' && method === 'GET') {
    return json(req, res, 200, { data: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } });
  }
  if (path === '/admin/bookings/booking-1/refund' && method === 'POST') {
    return json(req, res, 201, { status: 'REFUNDED' });
  }
  if (path === '/admin/audit-logs' && method === 'GET') {
    return json(req, res, 200, {
      data: [
        {
          id: 'audit-1',
          createdAt: '2026-04-22T10:10:00.000Z',
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          action: 'PAYOUT_PROCESSED',
          targetType: 'PayoutRequest',
          targetId: 'payout-1',
          metadata: { status: 'PAID' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
  }
  if (path === '/admin/audit-logs/retention' && method === 'POST') {
    return json(req, res, 201, { deleted: 2, cutoff: '2026-01-01T00:00:00.000Z' });
  }

  // --- Default: empty success for unmocked routes ---
  // This prevents SSR from crashing on unmocked endpoints
  if (method === 'GET') {
    return json(req, res, 200, { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  }
  return json(req, res, 200, { data: null });
});

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});
