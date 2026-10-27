/**
 * Session #3 P0-7a/P0-8 (#555, #419): support channels are configured
 * or hidden — never a dead default. The previous lib published
 * support@ouiboo.com (domain NXDOMAIN) whenever the env var was unset.
 */
describe('lib/support channel configuration', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
    jest.resetModules();
  });

  it('publishes nothing when no channel is configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPPORT_PHONE;
    jest.resetModules();
    const support = await import('./support');
    expect(support.SUPPORT_EMAIL).toBeNull();
    expect(support.isSupportEmailConfigured).toBe(false);
    expect(support.supportMailto()).toBeNull();
    expect(support.supportMailto('Escalation')).toBeNull();
    expect(support.SUPPORT_PHONE).toBeNull();
    expect(support.isSupportPhoneConfigured).toBe(false);
    expect(support.supportTelHref).toBeNull();
    expect(support.supportWhatsAppHref).toBeNull();
  });

  it('exposes the configured inbox and builds encoded mailto hrefs', async () => {
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'help@example.org';
    jest.resetModules();
    const support = await import('./support');
    expect(support.SUPPORT_EMAIL).toBe('help@example.org');
    expect(support.isSupportEmailConfigured).toBe(true);
    expect(support.supportMailto()).toBe('mailto:help@example.org');
    expect(support.supportMailto('Trip emergency — escalation')).toBe(
      'mailto:help@example.org?subject=Trip%20emergency%20%E2%80%94%20escalation',
    );
  });

  it('builds tel: and wa.me hrefs from the configured escalation number', async () => {
    process.env.NEXT_PUBLIC_SUPPORT_PHONE = '+212 6 12 34 56 78';
    jest.resetModules();
    const support = await import('./support');
    expect(support.SUPPORT_PHONE).toBe('+212 6 12 34 56 78');
    expect(support.supportTelHref).toBe('tel:+212612345678');
    expect(support.supportWhatsAppHref).toBe('https://wa.me/212612345678');
  });
});
