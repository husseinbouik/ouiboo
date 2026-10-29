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
