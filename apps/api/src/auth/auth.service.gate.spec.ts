/**
 * #264 — pre-bcrypt risk gate regression tests.
 *
 * Verifies the cheap Redis gate in AuthService.validateUser:
 * - gate trips with 429 after 10 failures, skipping bcrypt entirely
 * - gate is per-email and hashed (no PII in Redis keys)
 * - successful login clears the gate
 * - Redis outage / missing client fails open (login still works)
 * - passwords are never logged
 */
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

const FAKE_HASH = '$2b$10$abcdefghijklmnopqrstuuFAKEHASH';

function makeFakeRedis() {
  const store = new Map<string, { value: number; expiresAt: number }>();
  return {
    async get(key: string): Promise<string | null> {
      const e = store.get(key);
      if (!e || e.expiresAt <= Date.now()) { store.delete(key); return null; }
      return String(e.value);
    },
    async incr(key: string): Promise<number> {
      const e = store.get(key);
      const v = (e && e.expiresAt > Date.now() ? e.value : 0) + 1;
      store.set(key, { value: v, expiresAt: e?.expiresAt ?? 0 });
      return v;
    },
    async expire(key: string, s: number): Promise<void> {
      const e = store.get(key);
      if (e) e.expiresAt = Date.now() + s * 1000;
    },
    async del(key: string): Promise<void> { store.delete(key); },
    keys(): string[] { return [...store.keys()]; },
  };
}

const makeDb = () => ({
  user: {
    findUnique: async ({ where }: any) =>
      where.email === 'user@example.com'
        ? { id: '1', email: 'user@example.com', password: FAKE_HASH, isEmailVerified: true, role: 'TRAVELER' }
        : null,
  },
});

describe('AuthService login gate (#264)', () => {
  let bcryptCalls: number;
  let realCompare: typeof bcrypt.compare;

  beforeEach(() => {
    bcryptCalls = 0;
    realCompare = bcrypt.compare;
    (bcrypt as any).compare = async (candidate: string) => {
      bcryptCalls++;
      return candidate === 'correct';
    };
  });

  afterEach(() => {
    (bcrypt as any).compare = realCompare;
  });

  const makeService = (redisService: any) =>
    new AuthService(makeDb() as any, {} as any, {} as any, redisService);

  it('returns null and records a failure on wrong password', async () => {
    const svc = makeService({ getClient: () => makeFakeRedis() });
    const result = await svc.validateUser('user@example.com', 'wrong');
    expect(result).toBeNull();
    expect(bcryptCalls).toBe(1);
  });

  it('throws 429 and skips bcrypt after 10 failures', async () => {
    const redis = makeFakeRedis();
    const svc = makeService({ getClient: () => redis });
    for (let i = 0; i < 10; i++) {
      await svc.validateUser('user@example.com', 'wrong');
    }
    bcryptCalls = 0;
    await expect(svc.validateUser('user@example.com', 'wrong')).rejects.toMatchObject({
      status: 429,
    });
    expect(bcryptCalls).toBe(0); // cheap gate: no bcrypt CPU burned
  });

  it('scopes the gate per email (no PII in Redis keys)', async () => {
    const redis = makeFakeRedis();
    const svc = makeService({ getClient: () => redis });
    for (let i = 0; i < 10; i++) {
      await svc.validateUser('user@example.com', 'wrong');
    }
    // other email unaffected
    await expect(
      svc.validateUser('other@example.com', 'wrong'),
    ).resolves.toBeNull();
    // keys contain a sha256 digest, never the raw email
    for (const k of redis.keys()) {
      expect(k).not.toContain('user@example.com');
      expect(k).toMatch(/^login:gate:[0-9a-f]{64}$/);
    }
  });

  it('clears the gate after a successful login', async () => {
    const redis = makeFakeRedis();
    const svc = makeService({ getClient: () => redis });
    // 9 failures (below the 10-failure trip threshold), then a correct login
    for (let i = 0; i < 9; i++) {
      await svc.validateUser('user@example.com', 'wrong');
    }
    const okResult = await svc.validateUser('user@example.com', 'correct');
    expect(okResult).not.toBeNull();
    bcryptCalls = 0;
    // gate reset by the success: a new wrong password runs bcrypt and returns
    // 401-style null rather than 429 (counter restarted from 0)
    await expect(svc.validateUser('user@example.com', 'wrong')).resolves.toBeNull();
    expect(bcryptCalls).toBe(1);
  });

  it('returns 429 even for correct passwords while the gate is tripped', async () => {
    // Standard rate-limiter semantics: the window must expire before any
    // login (correct or not) is attempted again. This is what makes the gate
    // cheap — no bcrypt CPU is burned while tripped.
    const redis = makeFakeRedis();
    const svc = makeService({ getClient: () => redis });
    for (let i = 0; i < 10; i++) {
      await svc.validateUser('user@example.com', 'wrong');
    }
    await expect(svc.validateUser('user@example.com', 'correct')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('fails open when Redis throws', async () => {
    const svc = makeService({
      getClient: () => { throw new Error('redis down'); },
    });
    const result = await svc.validateUser('user@example.com', 'correct');
    expect(result).not.toBeNull();
    expect(result.email).toBe('user@example.com');
  });

  it('fails open when Redis client is unavailable', async () => {
    const svc = makeService({ getClient: () => null });
    const result = await svc.validateUser('user@example.com', 'correct');
    expect(result).not.toBeNull();
  });

  it('never logs passwords', async () => {
    const logged: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...a: any[]) => {
      logged.push(a.join(' '));
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...a: any[]) => {
      logged.push(a.join(' '));
    });
    const svc = makeService({ getClient: () => makeFakeRedis() });
    await svc.validateUser('user@example.com', 's3cr3t-p@ssw0rd');
    spy.mockRestore();
    warnSpy.mockRestore();
    expect(logged.join('\n')).not.toContain('s3cr3t-p@ssw0rd');
  });
});
