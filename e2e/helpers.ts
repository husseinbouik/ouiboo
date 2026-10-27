import type { Page, Route } from '@playwright/test';
import { createHmac } from 'node:crypto';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const jsonResponse = async (route: Route, status: number, body: Json) => {
  // CORS headers: the apps call the mock API cross-origin (app on :3001/:3002/:3003,
  // API on :3000), so preflights and responses must be explicitly allowed.
  // NOTE: the api client sends withCredentials: true, so we must echo the exact
  // request Origin (a wildcard '*' is rejected by browsers for credentialed requests)
  // and set Access-Control-Allow-Credentials.
  const origin = route.request().headers()['origin'] || '*';
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  });
};

/**
 * Signs a BFF session cookie (ouiboo_session) the same way apps/<app>/src/lib/session.ts
 * does, so tests can pass the #208 proxy auth gate without a real login.
 * Requires SESSION_SECRET to match the value the apps run with (set in CI env).
 */
const base64UrlEncode = (data: string): string =>
  Buffer.from(data, 'utf8').toString('base64url');

export const signTestSession = (role: 'AGENCY' | 'ADMIN' | 'TRAVELER', sub = 'e2e-test-user'): string => {
  const secret = process.env.SESSION_SECRET || 'e2e-test-secret';
  const payload = { sub, role, exp: Math.floor(Date.now() / 1000) + 15 * 60 };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encoded, 'utf8').digest('base64url');
  return `${encoded}.${signature}`;
};

/** Establishes an authenticated session for the given role before navigating to protected pages. */
export const authenticateAs = async (page: Page, role: 'AGENCY' | 'ADMIN' | 'TRAVELER') => {
  // #245: a real login also writes the api-client's session hint to
  // localStorage (setBrowserAccessToken), and AuthProvider probes
  // /users/me only when a session may exist. Seed the hint alongside the
  // cookies so this context models a logged-in browser faithfully —
  // without it the app correctly treats the context as anonymous and
  // never loads the user these cookies stand for.
  await seedLocalStorage(page, { 'ouiboo.session.hint': '1' });
  await page.context().addCookies([
    {
      name: 'ouiboo_session',
      value: signTestSession(role),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      // The proxy currently checks for refresh_token (pre-#208 behavior) because
      // the BFF /api/auth/session route 404s on Vercel. Set a dummy value so
      // e2e tests can reach protected pages.
      name: 'refresh_token',
      value: 'e2e-test-refresh-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
};

export const seedLocalStorage = async (page: Page, values: Record<string, string>) => {
  await page.addInitScript((entries) => {
    Object.entries(entries).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  }, values);
};

export const mockTravelerApi = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { searchParams } = url;
    // Normalize: the built app may use /api or /api/v1 as the API prefix
    // (NEXT_PUBLIC_API_URL is inlined at build time and differs per environment).
    const pathname = url.pathname.replace(/^\/api(\/v1)?/, '') || '/';
    const method = route.request().method();

    if (pathname === '/auth/register' && method === 'POST') {
      return jsonResponse(route, 201, {
        email: 'traveler@example.com',
        requiresEmailVerification: true,
        message: 'Verification code sent',
      });
    }

    if (pathname === '/auth/verify-email' && method === 'POST') {
      return jsonResponse(route, 201, { status: 'verified' });
    }

    if (pathname === '/auth/resend-otp' && method === 'POST') {
      return jsonResponse(route, 201, { status: 'resent' });
    }

    if (pathname === '/auth/login' && method === 'POST') {
      return jsonResponse(route, 201, {
        accessToken: 'traveler-token',
        refreshToken: 'traveler-refresh',
      });
    }

    if (pathname === '/users/me' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'traveler-1',
        name: 'Launch Traveler',
        email: 'traveler@example.com',
        role: 'TRAVELER',
      });
    }

    if (pathname === '/users/wishlist/count' && method === 'GET') {
      return jsonResponse(route, 200, { count: 1 });
    }

    if (pathname === '/agencies/agency-1/public' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'agency-1',
        companyName: 'Atlas Agency',
        bio: 'Trusted mountain escapes across Morocco.',
        logo: null,
        verificationStatus: 'VERIFIED',
      });
    }

    if (pathname === '/trips' && method === 'GET') {
      const agencyId = searchParams.get('agencyId');
      const q = (searchParams.get('q') || '').toLowerCase();
      const category = searchParams.get('category');
      const matchesSearch = !q || 'atlas weekend escape'.includes(q) || 'marrakech'.includes(q) || 'imlil'.includes(q);
      const matchesCategory = !category || category.toLowerCase() === 'adventure';
      const matchesAgency = !agencyId || agencyId === 'agency-1';
      const tripData = matchesSearch && matchesCategory && matchesAgency
        ? [
          {
            id: 'trip-1',
            title: 'Atlas Weekend Escape',
            category: 'Adventure',
            startLocation: 'Marrakech',
            // #560: beta fields — currency, endLocation, translations,
            // licence/insurance verification (the mock fixtures predated
            // them, so beta-shaped UI states were untestable).
            endLocation: 'Imlil',
            currency: 'MAD',
            translations: {
              fr: { title: 'Escapade week-end dans l\'Atlas', description: 'Une escapade guidée en montagne pour les tests de lancement.' },
              ar: { title: 'عطلة نهاية أسبوع في الأطلس', description: 'رحلة جبلية مصحوبة بمرشد لاختبارات الإطلاق.' },
              en: { title: 'Atlas Weekend Escape', description: 'A guided mountain escape for launch testing.' },
            },
            agency: {
              id: 'agency-1',
              verificationStatus: 'VERIFIED',
              travelLicenceStatus: 'VERIFIED',
              travelLicenceType: 'ODV',
              travelLicenceNumber: 'LIC-E2E-1',
              licenceVerifiedAt: '2026-10-01T00:00:00.000Z',
              insuranceStatus: 'VERIFIED',
              insuranceVerifiedAt: '2026-10-01T00:00:00.000Z',
            },
            sessions: [
              {
                id: 'session-1',
                status: 'OPEN',
                availableSeats: 8,
                price: 1800,
                startDate: '2027-05-10T00:00:00.000Z',
              },
            ],
          },
        ]
        : [];

      return jsonResponse(route, 200, {
        data: tripData,
        pagination: {
          total: tripData.length,
          page: Number(searchParams.get('page') || 1),
          limit: 20,
          totalPages: tripData.length > 0 ? 1 : 0,
        },
      });
    }

    if (pathname === '/trips/trip-1' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'trip-1',
        title: 'Atlas Weekend Escape',
        category: 'Adventure',
        startLocation: 'Marrakech',
        endLocation: 'Imlil',
        currency: 'MAD',
        translations: {
          fr: { title: 'Escapade week-end dans l\'Atlas', description: 'Une escapade guidée en montagne pour les tests de lancement.' },
          ar: { title: 'عطلة نهاية أسبوع في الأطلس', description: 'رحلة جبلية مصحوبة بمرشد لاختبارات الإطلاق.' },
          en: { title: 'Atlas Weekend Escape', description: 'A guided mountain escape for launch testing.' },
        },
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
          companyName: 'Atlas Co',
          bankDetails: 'RIB 1234567890',
          verificationStatus: 'VERIFIED',
          travelLicenceStatus: 'VERIFIED',
          travelLicenceType: 'ODV',
          travelLicenceNumber: 'LIC-E2E-1',
          licenceVerifiedAt: '2026-10-01T00:00:00.000Z',
          insuranceStatus: 'VERIFIED',
          insuranceVerifiedAt: '2026-10-01T00:00:00.000Z',
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
      });
    }

    if (pathname === '/trips/trip-1/reviews/stats' && method === 'GET') {
      return jsonResponse(route, 200, {
        averageRating: 4.8,
        totalReviews: 12,
        distribution: { 5: 8, 4: 4, 3: 0, 2: 0, 1: 0 },
      });
    }

    if (pathname === '/trips/trip-1/reviews' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    }

    if (pathname === '/bookings' && method === 'POST') {
      return jsonResponse(route, 201, { id: 'booking-1' });
    }

    if (pathname === '/bookings/booking-1' && method === 'GET') {
      return jsonResponse(route, 200, {
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
        traveler: {
          id: 'traveler-1',
          name: 'Launch Traveler',
          email: 'traveler@example.com',
        },
        session: {
          id: 'session-1',
          startDate: '2027-05-10T00:00:00.000Z',
          endDate: '2027-05-12T00:00:00.000Z',
          template: {
            id: 'trip-1',
            title: 'Atlas Weekend Escape',
          },
        },
      });
    }

    if (pathname === '/bookings/booking-1/payment-proof' && method === 'POST') {
      return jsonResponse(route, 201, { ok: true });
    }

    if (pathname === '/reviews' && method === 'POST') {
      return jsonResponse(route, 201, { id: 'review-1' });
    }

    return jsonResponse(route, 200, {});
  });
};

export const mockAgencyApi = async (page: Page) => {
  await page.route('**/bookings/*/payment-proof/download', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgR05oigAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    // Normalize: the built app may use /api or /api/v1 as the API prefix.
    const pathname = url.pathname.replace(/^\/api(\/v1)?/, '') || '/';
    const method = route.request().method();

    if (pathname === '/users/me' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'agency-user-1',
        name: 'Atlas Agency',
        email: 'agency@example.com',
        role: 'AGENCY',
        agencyProfile: {
          id: 'agency-1',
          companyName: 'Atlas Agency',
          bankDetails: null,
          verificationStatus: 'VERIFIED',
          subscriptionStatus: 'ACTIVE',
        },
      });
    }

    if (pathname === '/agency/stats' && method === 'GET') {
      return jsonResponse(route, 200, {
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

    if (pathname === '/agency/payments/overview' && method === 'GET') {
      return jsonResponse(route, 200, {
        currency: 'MAD',
        totalReceived: '1800.00',
        totalRefunded: '0.00',
        pendingVerificationCount: 0,
        pendingVerificationAmount: '0.00',
      });
    }

    if (pathname === '/agency/payments' && method === 'GET') {
      return jsonResponse(route, 200, {
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

    if (pathname === '/agency/bookings' && method === 'GET') {
      return jsonResponse(route, 200, [
        {
          id: 'booking-1',
          bookingDate: '2026-04-22T10:00:00.000Z',
          status: 'AWAITING_VALIDATION',
          paymentStatus: 'UNPAID',
          paymentMethod: 'MANUAL',
          totalAmount: 1800,
          guestsCount: 1,
          fullName: 'Launch Traveler',
          traveler: {
            id: 'traveler-1',
            name: 'Launch Traveler',
            email: 'traveler@example.com',
          },
          session: {
            id: 'session-1',
            startDate: '2026-05-10T00:00:00.000Z',
            endDate: '2026-05-12T00:00:00.000Z',
            template: {
              id: 'trip-1',
              title: 'Atlas Weekend Escape',
            },
          },
          paymentProof: {
            id: 'proof-1',
            imageUrl: 'proof-1.png',
            status: 'PENDING',
          },
        },
      ]);
    }

    return jsonResponse(route, 200, []);
  });
};

export const mockAdminApi = async (page: Page) => {
  let bookingPaymentStatus = 'PAID';
  let auditDeletedCount = 2;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    // Normalize: the built app may use /api or /api/v1 as the API prefix.
    const pathname = url.pathname.replace(/^\/api(\/v1)?/, '') || '/';
    const method = route.request().method();

    if (pathname === '/auth/login' && method === 'POST') {
      return jsonResponse(route, 201, {
        accessToken: 'admin-token',
        refreshToken: 'admin-refresh',
      });
    }

    if (pathname === '/auth/refresh' && method === 'POST') {
      return jsonResponse(route, 201, {
        accessToken: 'admin-token',
        refreshToken: 'admin-refresh',
      });
    }

    if (pathname === '/users/me' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'admin-1',
        name: 'Launch Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    }

    if (pathname === '/admin/pending-agencies' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/admin/pending-trips' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/admin/agencies' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/admin/bookings' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [
          {
            id: 'booking-1',
            status: 'CONFIRMED',
            paymentStatus: bookingPaymentStatus,
            paymentMethod: 'GATEWAY',
            paymentGatewayTransactionId: 'txn-1',
            totalAmount: 1800,
            guestsCount: 1,
            traveler: {
              id: 'traveler-1',
              name: 'Launch Traveler',
              email: 'traveler@example.com',
            },
            session: {
              id: 'session-1',
              startDate: '2026-05-10T00:00:00.000Z',
              endDate: '2026-05-12T00:00:00.000Z',
              template: {
                id: 'trip-1',
                title: 'Atlas Weekend Escape',
                agency: {
                  id: 'agency-1',
                  companyName: 'Atlas Agency',
                },
              },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 25, totalPages: 1 },
      });
    }

    if (pathname === '/admin/pending-payments' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/admin/bookings/booking-1/refund' && method === 'POST') {
      bookingPaymentStatus = 'REFUNDED';
      return jsonResponse(route, 201, { status: 'REFUNDED' });
    }

    if (pathname === '/admin/audit-logs' && method === 'GET') {
      return jsonResponse(route, 200, {
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

    if (pathname === '/admin/audit-logs/export' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'id,action\naudit-1,PAYOUT_PROCESSED\n',
      });
      return;
    }

    if (pathname === '/admin/audit-logs/retention' && method === 'POST') {
      return jsonResponse(route, 201, { deleted: auditDeletedCount, cutoff: '2026-01-01T00:00:00.000Z' });
    }

    return jsonResponse(route, 200, []);
  });
};
