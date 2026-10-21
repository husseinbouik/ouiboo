/**
 * Unit tests for the @ouiboo/session BFF route factory (#252), focused on
 * the /users/me validation retry behavior (#318):
 *  - a thrown (network/timeout) validation failure is retried exactly once
 *  - a second failure surfaces SESSION_UPSTREAM_ERROR (502)
 *  - an HTTP error response from the API is never retried
 *
 * `next/server` is mocked with a minimal NextResponse.json stand-in; the
 * signing path runs for real under Node's Web Crypto, like signing.test.ts.
 */
import { createSessionRoute } from '../route';
import type { NextRequest } from 'next/server';

jest.mock(
  'next/server',
  () => ({
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body,
        cookies: { set: jest.fn() },
      }),
    },
  }),
  // `next` is a peer dependency supplied by the apps, so it is not
  // installed for this package — register the mock virtually.
  { virtual: true },
);

const TEST_SECRET = 'test-session-secret-32-chars-min!!';
const API_URL = 'https://api.example.test/api/v1';

type RouteResult = {
  status: number;
  body: { error?: string; user?: { id: string; role: string } };
};

const fetchMock = jest.fn();

function apiResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function postRequest(accessToken: string) {
  return {
    json: async () => ({ accessToken }),
  } as unknown as NextRequest;
}

const VALID_USER = {
  id: 'user-1',
  email: 'traveler@example.test',
  name: 'Test Traveler',
  role: 'TRAVELER',
};

describe('createSessionRoute POST (token validation retry, #318)', () => {
  const { POST } = createSessionRoute({ allowedRole: 'TRAVELER', apiUrl: API_URL });

  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
    jest.restoreAllMocks();
  });

  it('creates a session when the API validates the token', async () => {
    fetchMock.mockResolvedValue(apiResponse(200, VALID_USER));

    const res = (await POST(postRequest('token-1'))) as unknown as RouteResult;

    expect(res.status).toBe(200);
    expect(res.body.user?.id).toBe('user-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries the validation once after a network failure, then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(apiResponse(200, VALID_USER));

    const res = (await POST(postRequest('token-1'))) as unknown as RouteResult;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns 502 SESSION_UPSTREAM_ERROR when validation keeps failing', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    const res = (await POST(postRequest('token-1'))) as unknown as RouteResult;

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('SESSION_UPSTREAM_ERROR');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the API answers with an HTTP error', async () => {
    fetchMock.mockResolvedValue(apiResponse(401, { message: 'Unauthorized' }));

    const res = (await POST(postRequest('bad-token'))) as unknown as RouteResult;

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('SESSION_INVALID_TOKEN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
