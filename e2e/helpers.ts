import type { Page, Route } from '@playwright/test';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const jsonResponse = async (route: Route, status: number, body: Json) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
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
    const { pathname, searchParams } = url;
    const method = route.request().method();

    if (pathname === '/api/auth/register' && method === 'POST') {
      return jsonResponse(route, 201, {
        email: 'traveler@example.com',
        requiresEmailVerification: true,
        message: 'Verification code sent',
      });
    }

    if (pathname === '/api/auth/verify-email' && method === 'POST') {
      return jsonResponse(route, 201, { status: 'verified' });
    }

    if (pathname === '/api/auth/resend-otp' && method === 'POST') {
      return jsonResponse(route, 201, { status: 'resent' });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      return jsonResponse(route, 201, {
        accessToken: 'traveler-token',
        refreshToken: 'traveler-refresh',
      });
    }

    if (pathname === '/api/users/me' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'traveler-1',
        name: 'Launch Traveler',
        email: 'traveler@example.com',
        role: 'TRAVELER',
      });
    }

    if (pathname === '/api/users/wishlist/count' && method === 'GET') {
      return jsonResponse(route, 200, { count: 1 });
    }

    if (pathname === '/api/agencies/agency-1/public' && method === 'GET') {
      return jsonResponse(route, 200, {
        id: 'agency-1',
        companyName: 'Atlas Agency',
        bio: 'Trusted mountain escapes across Morocco.',
        logo: null,
        verificationStatus: 'VERIFIED',
      });
    }

    if (pathname === '/api/trips' && method === 'GET') {
      const agencyId = searchParams.get('agencyId');
      const q = (searchParams.get('q') || '').toLowerCase();
      const category = searchParams.get('category');
      const matchesSearch = !q || 'atlas weekend escape'.includes(q) || 'marrakech'.includes(q);
      const matchesCategory = !category || category.toLowerCase() === 'adventure';
      const matchesAgency = !agencyId || agencyId === 'agency-1';
      const tripData = matchesSearch && matchesCategory && matchesAgency
        ? [
          {
            id: 'trip-1',
            title: 'Atlas Weekend Escape',
            category: 'Adventure',
            startLocation: 'Marrakech',
            durationDays: 3,
            images: ['https://example.com/trip.jpg'],
            agency: {
              id: 'agency-1',
              verificationStatus: 'VERIFIED',
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

    if (pathname === '/api/trips/trip-1' && method === 'GET') {
      return jsonResponse(route, 200, {
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
          companyName: 'Atlas Co',
          bankDetails: 'RIB 1234567890',
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

    if (pathname === '/api/trips/trip-1/reviews/stats' && method === 'GET') {
      return jsonResponse(route, 200, {
        averageRating: 4.8,
        totalReviews: 12,
        distribution: { 5: 8, 4: 4, 3: 0, 2: 0, 1: 0 },
      });
    }

    if (pathname === '/api/trips/trip-1/reviews' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    }

    if (pathname === '/api/bookings' && method === 'POST') {
      return jsonResponse(route, 201, { id: 'booking-1' });
    }

    if (pathname === '/api/bookings/booking-1' && method === 'GET') {
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
        documentNumber: 'AB123456',
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

    if (pathname === '/api/bookings/booking-1/payment-proof' && method === 'POST') {
      return jsonResponse(route, 201, { ok: true });
    }

    if (pathname === '/api/reviews' && method === 'POST') {
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
    const { pathname } = url;
    const method = route.request().method();

    if (pathname === '/api/users/me' && method === 'GET') {
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

    if (pathname === '/api/agency/stats' && method === 'GET') {
      return jsonResponse(route, 200, {
        revenue: 12000,
        totalBookings: 14,
        wallet: {
          availableBalance: 4500,
          pendingBalance: 900,
        },
      });
    }

    if (pathname === '/api/agency/payouts' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    }

    if (pathname === '/api/agency/payouts' && method === 'POST') {
      return jsonResponse(route, 201, { id: 'payout-1', status: 'PENDING' });
    }

    if (pathname === '/api/agency/bookings' && method === 'GET') {
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
  let payoutStatus = 'PENDING';
  let bookingPaymentStatus = 'PAID';
  let auditDeletedCount = 2;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const method = route.request().method();

    if (pathname === '/api/auth/login' && method === 'POST') {
      return jsonResponse(route, 201, {
        accessToken: 'admin-token',
        refreshToken: 'admin-refresh',
      });
    }

    if (pathname === '/api/auth/refresh' && method === 'POST') {
      return jsonResponse(route, 201, {
        accessToken: 'admin-token',
        refreshToken: 'admin-refresh',
      });
    }

    if (pathname === '/api/admin/pending-agencies' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/api/admin/pending-trips' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/api/admin/agencies' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/api/admin/bookings' && method === 'GET') {
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

    if (pathname === '/api/admin/pending-payments' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      });
    }

    if (pathname === '/api/admin/payout-requests' && method === 'GET') {
      return jsonResponse(route, 200, {
        data: [
          {
            id: 'payout-1',
            amount: 900,
            status: payoutStatus,
            requestedAt: '2026-04-22T10:00:00.000Z',
            processedAt: payoutStatus === 'PENDING' ? null : '2026-04-22T10:05:00.000Z',
            bankDetails: '{"rib":"1234567890"}',
            agency: {
              id: 'agency-1',
              companyName: 'Atlas Agency',
              user: {
                email: 'agency@example.com',
              },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 25, totalPages: 1 },
      });
    }

    if (pathname === '/api/admin/bookings/booking-1/refund' && method === 'POST') {
      bookingPaymentStatus = 'REFUNDED';
      return jsonResponse(route, 201, { status: 'REFUNDED' });
    }

    if (pathname === '/api/admin/payouts/payout-1/process' && method === 'POST') {
      payoutStatus = 'PAID';
      return jsonResponse(route, 201, { id: 'payout-1', status: 'PAID' });
    }

    if (pathname === '/api/admin/audit-logs' && method === 'GET') {
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

    if (pathname === '/api/admin/audit-logs/export' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'id,action\naudit-1,PAYOUT_PROCESSED\n',
      });
      return;
    }

    if (pathname === '/api/admin/audit-logs/retention' && method === 'POST') {
      return jsonResponse(route, 201, { deleted: auditDeletedCount, cutoff: '2026-01-01T00:00:00.000Z' });
    }

    return jsonResponse(route, 200, []);
  });
};
