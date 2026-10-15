import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

const TRUSTED = 'https://ouiboo-traveler-nu.vercel.app';
const EVIL = 'https://evil.example.com';

function mockContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    guard = new CsrfGuard();
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = [TRUSTED, 'https://ouiboo-agency-gold.vercel.app'].join(',');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows a request with a trusted Origin', () => {
    const ctx = mockContext({ origin: TRUSTED });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a request with an untrusted Origin', () => {
    const ctx = mockContext({ origin: EVIL });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a request with a trusted Referer when Origin is absent', () => {
    const ctx = mockContext({ referer: `${TRUSTED}/dashboard` });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a request with an untrusted Referer when Origin is absent', () => {
    const ctx = mockContext({ referer: `${EVIL}/steal` });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects a request with a malformed Referer', () => {
    const ctx = mockContext({ referer: 'not-a-url' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a header-less request with X-Requested-With (non-browser client)', () => {
    const ctx = mockContext({ 'x-requested-with': 'XMLHttpRequest' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a request with no Origin, Referer, or X-Requested-With (fail closed)', () => {
    const ctx = mockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('prefers Origin over Referer when both are present', () => {
    // Trusted origin wins even with evil referer
    const ctx = mockContext({ origin: TRUSTED, referer: `${EVIL}/x` });
    expect(guard.canActivate(ctx)).toBe(true);
    // Evil origin rejected even with trusted referer
    const ctx2 = mockContext({ origin: EVIL, referer: `${TRUSTED}/x` });
    expect(() => guard.canActivate(ctx2)).toThrow(ForbiddenException);
  });

  it('is case-sensitive on origin matching', () => {
    const ctx = mockContext({ origin: TRUSTED.toUpperCase() });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
