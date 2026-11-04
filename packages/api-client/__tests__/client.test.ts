/**
 * Unit tests for the @ouiboo/api-client cold-start resilience (#318):
 *  - createApiClient applies a bounded request timeout
 *  - a request that fails with NO response (network error) is retried once
 *  - a request is never retried when the server answered (HTTP error)
 *  - a request that keeps failing at the network level is retried only once
 *  - establishAppSession retries a network failure / a BFF 502 once, and
 *    still fails loudly on authoritative errors (#234)
 *
 * The axios retry tests drive the real client through a stub adapter, so
 * the interceptor chain under test is the production one.
 */
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';
import {
  BROWSER_SESSION_HINT_KEY,
  clearBrowserAccessToken,
  createApiClient,
  createBrowserApiClient,
  establishAppSession,
  hasBrowserSessionHint,
  hasPossibleBrowserSession,
  setBrowserAccessToken,
} from '../client';

const BASE_URL = 'https://api.example.test/api/v1';

function okResponse(config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  };
}

function networkError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK', config);
}

function httpError(
  config: InternalAxiosRequestConfig,
  status: number,
): AxiosError {
  const error = new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    config,
  );
  error.response = {
    data: { message: 'server answered' },
    status,
    statusText: '',
    headers: {},
    config,
  };
  return error;
}

describe('createApiClient (#318)', () => {
  it('applies a bounded request timeout', () => {
    const client = createApiClient(BASE_URL);
    expect(client.defaults.timeout).toBe(20000);
  });

  it('retries a request once when it fails with no response, then succeeds', async () => {
    const client = createApiClient(BASE_URL);
    let calls = 0;
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      calls++;
      if (calls === 1) throw networkError(config);
      return okResponse(config);
    };

    const res = await client.get('/trips');

    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('never retries when the server answered with an HTTP error', async () => {
    const client = createApiClient(BASE_URL);
    let calls = 0;
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      calls++;
      throw httpError(config, 401);
    };

    await expect(client.get('/users/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(calls).toBe(1);
  });

  it('gives up after exactly one retry when the network keeps failing', async () => {
    const client = createApiClient(BASE_URL);
    let calls = 0;
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      calls++;
      throw networkError(config);
    };

    await expect(client.get('/trips')).rejects.toThrow('Network Error');
    expect(calls).toBe(2);
  });
});

describe('establishAppSession (#318, #234)', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('retries once after a network failure, then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await expect(establishAppSession('token-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once after a BFF 502 (upstream unreachable), then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await expect(establishAppSession('token-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails loudly without retrying on an authoritative error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    await expect(establishAppSession('bad-token')).rejects.toThrow(
      'Session establishment failed: 401',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows after the single retry when the network keeps failing', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));

    await expect(establishAppSession('token-1')).rejects.toThrow(
      'Failed to fetch',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('anonymous session probing (#245)', () => {
  // Minimal browser stand-ins: the package runs its tests in node, where
  // `window` is undefined and every hint helper must safely no-op. These
  // stubs model the browser surface client.ts actually touches.
  const storage = new Map<string, string>();
  const localStorageStub = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  };
  const locationStub = { href: '' };
  const fetchMock = jest.fn();

  beforeEach(() => {
    storage.clear();
    locationStub.href = '';
    (global as any).window = {
      localStorage: localStorageStub,
      location: locationStub,
    };
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(async () => {
    await setBrowserAccessToken(null);
    clearBrowserAccessToken();
    jest.restoreAllMocks();
    delete (global as any).window;
  });

  it('tracks the session hint alongside the token lifecycle', async () => {
    expect(hasBrowserSessionHint()).toBe(false);
    expect(hasPossibleBrowserSession()).toBe(false);

    await setBrowserAccessToken('token-1');
    expect(hasBrowserSessionHint()).toBe(true);
    expect(hasPossibleBrowserSession()).toBe(true);

    clearBrowserAccessToken();
    expect(hasBrowserSessionHint()).toBe(false);
    expect(hasPossibleBrowserSession()).toBe(false);
  });

  it('does not call /auth/refresh for a 401 when no session can exist', async () => {
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockRejectedValue(new Error('refresh must not be called'));
    const client = createBrowserApiClient(BASE_URL);
    let calls = 0;
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      calls++;
      throw httpError(config, 401);
    };

    await expect(client.get('/users/me')).rejects.toBeTruthy();

    expect(calls).toBe(1);
    expect(postSpy).not.toHaveBeenCalled();
    // The anonymous profile probe must not bounce the visitor to login.
    expect(locationStub.href).toBe('');
  });

  it('leaves pre-session auth-flow 401s to the caller: no refresh, no redirect (#640)', async () => {
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockRejectedValue(new Error('refresh must not be called'));
    // Mid-challenge state: the in-memory token slot holds the MFA
    // challenge token and a session hint exists — exactly the state in
    // which a wrong TOTP code used to bounce the admin to /login.
    await setBrowserAccessToken('challenge-token');
    const client = createBrowserApiClient(BASE_URL);
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      throw httpError(config, 401);
    };

    for (const path of [
      '/auth/mfa/verify',
      '/auth/mfa/recovery',
      '/auth/mfa/enrollment/confirm',
      '/auth/break-glass',
    ]) {
      await expect(client.post(path, {})).rejects.toBeTruthy();
      expect(locationStub.href).toBe('');
    }
    expect(postSpy).not.toHaveBeenCalled();
    // The challenge token must survive: the form retries with it.
    expect(hasBrowserSessionHint()).toBe(true);
  });

  it('attempts the refresh when only the persisted hint remains (post-reload)', async () => {
    // Fresh module registry = empty in-memory token, like after a reload;
    // the hint in localStorage is the only trace of the earlier login.
    let fresh: typeof import('../client');
    let freshAxios: typeof axios;
    jest.isolateModules(() => {
      freshAxios = require('axios').default;
      fresh = require('../client');
    });
    localStorageStub.setItem(BROWSER_SESSION_HINT_KEY, '1');
    expect(fresh!.hasPossibleBrowserSession()).toBe(true);

    const postSpy = jest
      .spyOn(freshAxios!, 'post')
      .mockRejectedValue(new Error('refresh cookie expired'));
    const client = fresh!.createBrowserApiClient(BASE_URL);
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      throw httpError(config, 401);
    };

    await expect(client.get('/users/me')).rejects.toBeTruthy();

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(String(postSpy.mock.calls[0][0])).toContain('/auth/refresh');
    // The failed restore clears the hint, so later loads stay silent.
    expect(fresh!.hasBrowserSessionHint()).toBe(false);
  });
});

describe('refresh-rotation race (#840)', () => {
  // Same browser stand-ins as the #245 suite above.
  const storage = new Map<string, string>();
  const localStorageStub = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  };
  const locationStub = { href: '' };
  const fetchMock = jest.fn();

  const authOf = (config: InternalAxiosRequestConfig): unknown => {
    const headers = config.headers as unknown as {
      get?: (name: string) => unknown;
      Authorization?: unknown;
      authorization?: unknown;
    };
    return headers?.get?.('Authorization') ??
      headers?.Authorization ??
      headers?.authorization;
  };

  beforeEach(() => {
    storage.clear();
    locationStub.href = '';
    (global as any).window = {
      localStorage: localStorageStub,
      location: locationStub,
    };
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(async () => {
    await setBrowserAccessToken(null);
    clearBrowserAccessToken();
    jest.restoreAllMocks();
    delete (global as any).window;
  });

  it('(a) concurrent 401s across TWO client instances share exactly one refresh and both retry to 200', async () => {
    await setBrowserAccessToken('token-old');
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockImplementation(async () => {
        // Hold the refresh open so both instances' 401 handlers overlap
        // on the same in-flight refresh.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { data: { accessToken: 'token-new' } } as never;
      });

    const makeAdapter = (counter: { n: number }) =>
      async (
        config: InternalAxiosRequestConfig,
      ): Promise<AxiosResponse> => {
        counter.n++;
        if (authOf(config) === 'Bearer token-new') return okResponse(config);
        throw httpError(config, 401);
      };

    const calls1 = { n: 0 };
    const calls2 = { n: 0 };
    const client1 = createBrowserApiClient(BASE_URL);
    client1.defaults.adapter = makeAdapter(calls1);
    const client2 = createBrowserApiClient(BASE_URL);
    client2.defaults.adapter = makeAdapter(calls2);

    const [res1, res2] = await Promise.all([
      client1.get('/users/me'),
      client2.get('/users/me'),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Exactly ONE refresh for both instances, despite the rotation race.
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(String(postSpy.mock.calls[0][0])).toContain('/auth/refresh');
    // Each request: one 401 attempt + one successful retry.
    expect(calls1.n).toBe(2);
    expect(calls2.n).toBe(2);
    // Session survives: no teardown, no bounce to /login.
    expect(locationStub.href).toBe('');
    expect(hasBrowserSessionHint()).toBe(true);
  });

  it('(b) stale-token 401 after a completed refresh retries with the current token — no second refresh, no logout', async () => {
    await setBrowserAccessToken('token-old');
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'token-new' } } as never);

    let slowCalls = 0;
    const client = createBrowserApiClient(BASE_URL);
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      if (String(config.url).includes('/slow')) {
        slowCalls++;
        if (slowCalls === 1) {
          // Dispatched with token-old; the server answers only after a
          // concurrent refresh has already rotated the session — the
          // classic mid-rotation 401.
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw httpError(config, 401);
        }
        return okResponse(config);
      }
      // /fast: 401 until it carries the rotated token, then 200.
      if (authOf(config) === 'Bearer token-new') return okResponse(config);
      throw httpError(config, 401);
    };

    const slowPromise = client.get('/slow');
    const fastPromise = client.get('/fast');
    const [slowRes, fastRes] = await Promise.all([slowPromise, fastPromise]);

    expect(fastRes.status).toBe(200);
    expect(slowRes.status).toBe(200);
    expect(slowCalls).toBe(2);
    // Only the fast request's refresh happened; the slow request's stale
    // 401 was healed by retrying with the current token.
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(locationStub.href).toBe('');
    expect(hasBrowserSessionHint()).toBe(true);
  });

  it('(c) definitively revoked refresh: all callers reject, hint cleared, session torn down exactly once', async () => {
    await setBrowserAccessToken('token-old');
    expect(hasBrowserSessionHint()).toBe(true);
    // Ignore the BFF session-establish call made by the setup above.
    fetchMock.mockClear();

    const postSpy = jest
      .spyOn(axios, 'post')
      .mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const error = new Error('Request failed with status code 401');
        (error as { response?: unknown }).response = {
          status: 401,
          data: {},
        };
        throw error;
      });

    const adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      throw httpError(config, 401);
    };
    const client1 = createBrowserApiClient(BASE_URL);
    client1.defaults.adapter = adapter;
    const client2 = createBrowserApiClient(BASE_URL);
    client2.defaults.adapter = adapter;

    const results = await Promise.allSettled([
      client1.get('/users/me'),
      client2.get('/bookings'),
    ]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    // The failed refresh is shared, not duplicated per instance: one
    // initial attempt + the single #846 race retry, shared by both.
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(hasBrowserSessionHint()).toBe(false);
    expect(hasPossibleBrowserSession()).toBe(false);
    // clearBrowserAccessToken fires exactly one BFF session DELETE; two
    // waiting instances must not tear the session down twice.
    const deleteCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as { method?: string } | undefined)?.method === 'DELETE',
    );
    expect(deleteCalls).toHaveLength(1);
    expect(locationStub.href).toBe('/login');
  });

  it('(d) a refresh 401 from a lost cross-context race heals on the in-lock retry — no teardown (#846)', async () => {
    await setBrowserAccessToken('token-old');
    let refreshCalls = 0;
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockImplementation(async () => {
        refreshCalls++;
        if (refreshCalls === 1) {
          // Another context rotated first; the server's atomic claim
          // rejected the cookie value this attempt carried.
          const error = new Error('Request failed with status code 401');
          (error as { response?: unknown }).response = {
            status: 401,
            data: {},
          };
          throw error;
        }
        // The retry presents the cookie jar's current (rotated) value.
        return { data: { accessToken: 'token-new' } } as never;
      });

    const client = createBrowserApiClient(BASE_URL);
    client.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      if (authOf(config) === 'Bearer token-new') return okResponse(config);
      throw httpError(config, 401);
    };

    const res = await client.get('/users/me');

    expect(res.status).toBe(200);
    expect(postSpy).toHaveBeenCalledTimes(2);
    // The session the other context restored is NOT torn down.
    expect(locationStub.href).toBe('');
    expect(hasBrowserSessionHint()).toBe(true);
    expect(hasPossibleBrowserSession()).toBe(true);
  });

  it('(e) independent refresh domains (two tabs) serialize through the shared Web Lock — the server claim never sees a concurrent duplicate (#846)', async () => {
    // A minimal LockManager: a promise-chain mutex, standing in for the
    // browser's per-origin lock registry shared by every tab.
    let chain: Promise<unknown> = Promise.resolve();
    const lockManager = {
      request: (_name: string, cb: () => Promise<string | null>) => {
        const run = chain.then(cb, cb);
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      },
    };
    (global as any).navigator = { locks: lockManager };

    // The fake server claim: only ONE refresh may be in flight; a
    // concurrent second POST is rejected 401, like the atomic
    // single-use claim. Each accepted POST mints the next token.
    let inFlight = 0;
    let overlaps = 0;
    let minted = 0;
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockImplementation(async () => {
        if (inFlight > 0) {
          overlaps++;
          const error = new Error('Request failed with status code 401');
          (error as { response?: unknown }).response = {
            status: 401,
            data: {},
          };
          throw error;
        }
        inFlight++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        inFlight--;
        minted++;
        return { data: { accessToken: `token-${minted}` } } as never;
      });

    try {
      await setBrowserAccessToken('token-old');

      // Two clients on DIFFERENT base URLs have independent in-page
      // single-flights (separate inFlightRefreshes keys) — the same
      // independence two tabs of one origin have. Only the Web Lock is
      // shared between them.
      const adapter = async (
        config: InternalAxiosRequestConfig,
      ): Promise<AxiosResponse> => {
        const auth = authOf(config);
        if (auth === 'Bearer token-1' || auth === 'Bearer token-2') {
          return okResponse(config);
        }
        throw httpError(config, 401);
      };
      const clientA = createBrowserApiClient(BASE_URL);
      clientA.defaults.adapter = adapter;
      const clientB = createBrowserApiClient(`${BASE_URL}/other-domain`);
      clientB.defaults.adapter = adapter;

      const [resA, resB] = await Promise.all([
        clientA.get('/users/me'),
        clientB.get('/users/me'),
      ]);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
      // Two refreshes happened (one per domain) but NEVER overlapped,
      // so the claim never rejected one and no session was torn down.
      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(overlaps).toBe(0);
      expect(locationStub.href).toBe('');
      expect(hasBrowserSessionHint()).toBe(true);
    } finally {
      delete (global as any).navigator;
    }
  });
});
