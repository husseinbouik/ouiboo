import { parseEnv } from './env'

/**
 * #1030 (B4 + A12): the boot env schema. Production enforcement mirrors
 * the old validateRequiredEnv() semantics (same required set, same JWT
 * rules); non-production boots stay lenient so dev/test keep working
 * with partial env.
 */
describe('parseEnv (#1030)', () => {
  const productionEnv = (): NodeJS.ProcessEnv => ({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/ouiboo',
    JWT_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
    CORS_ORIGINS: 'https://ouiboo.example',
    REDIS_URL: 'redis://localhost:6379',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'mailer',
    SMTP_PASS: 'smtp-password-value',
    TRUST_PROXY_HOPS: '1',
  })

  it('parses a complete production env and applies defaults', () => {
    const env = parseEnv(productionEnv())

    expect(env.NODE_ENV).toBe('production')
    expect(env.PORT).toBe(3000)
    expect(env.STORAGE_PROVIDER).toBe('local')
    expect(env.SMTP_PORT).toBe('587')
    expect(env.ENABLE_GATEWAY_PAYMENTS).toBeUndefined()
  })

  it('rejects a production env missing required variables, naming them', () => {
    const source = productionEnv()
    delete source.DATABASE_URL
    delete source.REDIS_URL

    expect(() => parseEnv(source)).toThrow(/DATABASE_URL/)
    expect(() => parseEnv(source)).toThrow(/REDIS_URL/)
  })

  it('rejects production JWT secrets that are too short', () => {
    const source = { ...productionEnv(), JWT_SECRET: 'short' }

    expect(() => parseEnv(source)).toThrow(/JWT_SECRET/)
  })

  it('rejects production JWT secrets that look like placeholders', () => {
    const source = {
      ...productionEnv(),
      JWT_SECRET: 'demo'.padEnd(40, 'x'),
    }

    expect(() => parseEnv(source)).toThrow(/JWT_SECRET/)
  })

  it('rejects identical production JWT and refresh secrets', () => {
    const same = 'c'.repeat(40)
    const source = {
      ...productionEnv(),
      JWT_SECRET: same,
      JWT_REFRESH_SECRET: same,
    }

    expect(() => parseEnv(source)).toThrow(/must be different/)
  })

  it('stays lenient outside production: partial env parses with defaults', () => {
    const env = parseEnv({ NODE_ENV: 'test' })

    expect(env.NODE_ENV).toBe('test')
    expect(env.DATABASE_URL).toBeUndefined()
    expect(env.PORT).toBe(3000)
  })

  it('defaults NODE_ENV to development when unset', () => {
    expect(parseEnv({}).NODE_ENV).toBe('development')
  })

  it('coerces a valid PORT and falls back to 3000 for an invalid one', () => {
    expect(parseEnv({ PORT: '4100' }).PORT).toBe(4100)
    expect(parseEnv({ PORT: 'not-a-port' }).PORT).toBe(3000)
  })

  it('parses optional numeric settings and ignores invalid ones', () => {
    const env = parseEnv({
      WORKER_HEARTBEAT_INTERVAL_MS: '15000',
      AUDIT_LOG_RETENTION_DAYS: 'abc',
    })

    expect(env.WORKER_HEARTBEAT_INTERVAL_MS).toBe(15000)
    expect(env.AUDIT_LOG_RETENTION_DAYS).toBeUndefined()
  })

  it('rejects an invalid STORAGE_PROVIDER', () => {
    expect(() => parseEnv({ STORAGE_PROVIDER: 'ftp' })).toThrow()
  })
})
