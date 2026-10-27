/**
 * #564/#563: LANDING_URL resolution, the single indexing gate and the
 * canonical per-locale copy in lib/site. The module resolves the
 * landing app's public origin at import time, so each case sets the
 * environment first and loads a fresh copy of the module (same pattern
 * as the traveller site.test for #468).
 */
describe('site LANDING_URL resolution (#564)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  const loadSite = async (env: Record<string, string | undefined>) => {
    jest.resetModules();
    for (const key of [
      'NEXT_PUBLIC_LANDING_URL',
      'NEXT_PUBLIC_LANDING_INDEXABLE',
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
      NEXT_PUBLIC_LANDING_URL: 'https://landing.example.com',
      NODE_ENV: 'production',
    });
    expect(site.LANDING_URL).toBe('https://landing.example.com');
    expect(site.absoluteLandingUrl('/sitemap.xml')).toBe(
      'https://landing.example.com/sitemap.xml',
    );
  });

  it('falls back to the Vercel production host in production builds without a configured URL', async () => {
    const site = await loadSite({
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'ouiboo-landing-staging.vercel.app',
    });
    expect(site.LANDING_URL).toBe('https://ouiboo-landing-staging.vercel.app');
  });

  it('treats a loopback configured URL as missing in production builds', async () => {
    const site = await loadSite({
      NEXT_PUBLIC_LANDING_URL: 'http://localhost:3004',
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'ouiboo-landing-staging.vercel.app',
    });
    expect(site.LANDING_URL).toBe('https://ouiboo-landing-staging.vercel.app');
  });

  it('keeps the loopback default outside production (local development)', async () => {
    const site = await loadSite({ NODE_ENV: 'development' });
    expect(site.LANDING_URL).toBe('http://localhost:3004');
  });

  it('is not indexable by default and only on the exact opt-in', async () => {
    const closed = await loadSite({ NODE_ENV: 'production' });
    expect(closed.isLandingIndexable()).toBe(false);
    const open = await loadSite({
      NODE_ENV: 'production',
      NEXT_PUBLIC_LANDING_INDEXABLE: 'true',
    });
    expect(open.isLandingIndexable()).toBe(true);
    expect(open.isLandingIndexable('yes')).toBe(false);
  });
});

describe('site canonical copy (#563)', () => {
  it('carries en/fr/ar tagline, title, description and og:locale', async () => {
    const { SITE_COPY, OG_LOCALES } = await import('./site');
    expect(Object.keys(SITE_COPY).sort()).toEqual(['ar', 'en', 'fr']);
    for (const copy of Object.values(SITE_COPY)) {
      expect(copy.tagline.length).toBeGreaterThan(0);
      expect(copy.title).toContain(copy.tagline);
      expect(copy.description.length).toBeGreaterThan(0);
      expect(copy.ogLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
    expect(OG_LOCALES.sort()).toEqual(['ar_MA', 'en_US', 'fr_FR']);
    // ONE tagline: the English one is the email layout's tagline.
    expect(SITE_COPY.en.tagline).toBe('Travel made personal');
  });
});
