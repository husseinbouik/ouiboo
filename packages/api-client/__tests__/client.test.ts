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
import { createApiClient, establishAppSession } from '../client';

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
