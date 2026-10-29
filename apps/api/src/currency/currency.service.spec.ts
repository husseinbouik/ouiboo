/**
 * #649: the currency feed silently served static fallback constants
 * in production — the exchangerate-api.io v4 endpoint no longer
 * answers keyless, every fetch failed, and the old implementation
 * then CACHED the fallback for 24h so it looked like a live rate.
 * Locked behaviour:
 * - a successful provider response ({ result: 'success', rates })
 *   parses to a `live` rate and is cached;
 * - any provider failure (network, HTTP, non-success result) serves
 *   the fallback constant as source `fallback`, logs a loud
 *   warning, and never writes the fallback to the cache;
 * - a cache hit reports source `cache` with the rate's real
 *   fetchedAt / ageSeconds;
 * - the base currency short-circuits as source `base`;
 * - getExchangeRates keeps its plain-string contract.
 */
import { Logger } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import type { DatabaseService } from '../database/database.service';

const PROVIDER_RATES = { EUR: 0.091156, USD: 0.100512, GBP: 0.0759, AED: 0.369, TND: 0.314 };

function makeService(cachedRow: unknown = null) {
  const prisma = {
    exchangeRate: {
      findUnique: jest.fn(async () => cachedRow),
      upsert: jest.fn(async () => ({})),
    },
  };
  const service = new CurrencyService(prisma as unknown as DatabaseService);
  return { service, prisma };
}

function mockFetchOk() {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      result: 'success',
      base_code: 'MAD',
      time_last_update_unix: 1793232151,
      rates: PROVIDER_RATES,
    }),
  }));
}

describe('CurrencyService (#649)', () => {
  const originalFetch = global.fetch;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses a live provider response and caches it as source=live', async () => {
    global.fetch = mockFetchOk() as unknown as typeof fetch;
    const { service, prisma } = makeService();

    const info = await service.getExchangeRateInfo('EUR');

    expect(info.source).toBe('live');
    expect(info.rate).toBe('0.09115600');
    expect(info.ageSeconds).toBe(0);
    expect(info.fetchedAt).not.toBeNull();
    expect(prisma.exchangeRate.upsert).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('serves the fallback loudly (and never caches it) when the provider rejects non-success', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: 'error', 'error-type': 'invalid-key' }),
    })) as unknown as typeof fetch;
    const { service, prisma } = makeService();

    const info = await service.getExchangeRateInfo('EUR');

    expect(info.source).toBe('fallback');
    expect(info.rate).toBe('0.09200000');
    expect(info.fetchedAt).toBeNull();
    expect(prisma.exchangeRate.upsert).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('FALLBACK');
  });

  it('serves the fallback loudly when the fetch itself fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('fetch failed');
    }) as unknown as typeof fetch;
    const { service, prisma } = makeService();

    const info = await service.getExchangeRateInfo('USD');

    expect(info.source).toBe('fallback');
    expect(info.rate).toBe('0.10000000');
    expect(prisma.exchangeRate.upsert).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('reports a cache hit with its real age and does not call the provider', async () => {
    const fetchedAt = new Date(Date.now() - 3600 * 1000);
    global.fetch = mockFetchOk() as unknown as typeof fetch;
    const { service } = makeService({
      baseCurrency: 'MAD',
      targetCurrency: 'EUR',
      rate: '0.09150000',
      lastUpdated: fetchedAt,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    const info = await service.getExchangeRateInfo('EUR');

    expect(info.source).toBe('cache');
    expect(info.rate).toBe('0.09150000');
    expect(info.fetchedAt).toBe(fetchedAt.toISOString());
    expect(info.ageSeconds).toBeGreaterThanOrEqual(3599);
    expect(info.ageSeconds).toBeLessThanOrEqual(3605);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('short-circuits the base currency without touching provider or cache', async () => {
    global.fetch = mockFetchOk() as unknown as typeof fetch;
    const { service, prisma } = makeService();

    const info = await service.getExchangeRateInfo('MAD');

    expect(info).toEqual({ rate: '1.00000000', source: 'base', fetchedAt: null, ageSeconds: null });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.exchangeRate.findUnique).not.toHaveBeenCalled();
  });

  it('keeps the getExchangeRates plain-string contract', async () => {
    global.fetch = mockFetchOk() as unknown as typeof fetch;
    const { service } = makeService();
    await expect(service.getExchangeRates('EUR')).resolves.toBe('0.09115600');
  });

  it('updateExchangeRates flags the refresh DEGRADED when the provider is down', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('fetch failed');
    }) as unknown as typeof fetch;
    const { service } = makeService();

    await service.updateExchangeRates();

    expect(errorSpy).toHaveBeenCalled();
    const messages = errorSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(messages).toContain('DEGRADED');
  });

  it('updateExchangeRates completes cleanly when the provider answers', async () => {
    global.fetch = mockFetchOk() as unknown as typeof fetch;
    const { service, prisma } = makeService();

    await service.updateExchangeRates();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(prisma.exchangeRate.upsert).toHaveBeenCalledTimes(5);
  });
});
