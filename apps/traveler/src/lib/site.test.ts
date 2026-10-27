/**
 * #468: TRAVELER_URL resolution in lib/site. The module resolves the
 * traveller app's public origin at import time, so each case sets the
 * environment first and loads a fresh copy of the module.
 */
describe('site TRAVELER_URL resolution (#468)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  const loadSite = async (env: Record<string, string | undefined>) => {
    jest.resetModules();
    for (const key of [
      'NEXT_PUBLIC_TRAVELER_URL',
      'VERCEL_PROJECT_PRODUCTION_URL',
      'VERCEL_URL',
      'NODE_ENV',
    ]) {
      delete process.env[key];
    }
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) process.env[key] = value;
    }
    return import('./site');
  };

  it('uses the configured public URL', async () => {
    const site = await loadSite({
      NEXT_PUBLIC_TRAVELER_URL: 'https://traveler.example.com',
      NODE_ENV: 'production',
    });
    expect(site.TRAVELER_URL).toBe('https://traveler.example.com');
    expect(site.absoluteTravelerUrl('/trip/abc')).toBe('https://traveler.example.com/trip/abc');
  });

  it('falls back to the Vercel production host in production builds without a configured URL', async () => {
    const site = await loadSite({
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'ouiboo-traveler-staging.vercel.app',
    });
    expect(site.TRAVELER_URL).toBe('https://ouiboo-traveler-staging.vercel.app');
  });

  it('uses the deployment host when no production domain is exposed', async () => {
    const site = await loadSite({
      NODE_ENV: 'production',
      VERCEL_URL: 'ouiboo-traveler-abc123.vercel.app',
    });
    expect(site.TRAVELER_URL).toBe('https://ouiboo-traveler-abc123.vercel.app');
  });

  it('treats a loopback configured URL as missing in production builds', async () => {
    const site = await loadSite({
      NEXT_PUBLIC_TRAVELER_URL: 'http://localhost:3001',
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'ouiboo-traveler-staging.vercel.app',
    });
    expect(site.TRAVELER_URL).toBe('https://ouiboo-traveler-staging.vercel.app');
  });

  it('keeps the loopback default outside production (local development)', async () => {
    const site = await loadSite({ NODE_ENV: 'development' });
    expect(site.TRAVELER_URL).toBe('http://localhost:3001');
  });

  it('keeps a loopback configured URL outside production', async () => {
    const site = await loadSite({
      NEXT_PUBLIC_TRAVELER_URL: 'http://localhost:3001',
      NODE_ENV: 'development',
    });
    expect(site.TRAVELER_URL).toBe('http://localhost:3001');
  });
});
