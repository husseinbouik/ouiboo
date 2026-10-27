import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { GlobalExceptionFilter } from './global-exception.filter'

describe('GlobalExceptionFilter structured error logging (#399)', () => {
  const makeHost = (url: string) => {
    const json = jest.fn()
    const type = jest.fn(() => ({ json }))
    const status = jest.fn(() => ({ type }))
    const response = { status, type, json }
    const request = {
      method: 'GET',
      url,
      originalUrl: url,
      correlationId: 'cid-test-1',
    }
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost
    return { host, status, json }
  }

  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined)
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  const jsonLineFrom = (spy: jest.SpyInstance): string => {
    const line = spy.mock.calls
      .map((call) => call[0])
      .find((arg): arg is string => typeof arg === 'string' && arg.startsWith('{'))
    if (!line) throw new Error('no structured JSON log line was emitted')
    return line
  }

  it('logs a structured http_error line for a 404 and strips the query string', () => {
    const { host, status } = makeHost('/api/v1/upload/file?token=supersecret')
    new GlobalExceptionFilter().catch(new NotFoundException('nope'), host)

    expect(status).toHaveBeenCalledWith(404)
    const line = jsonLineFrom(warnSpy)
    expect(line).not.toContain('supersecret')
    const parsed = JSON.parse(line)
    expect(parsed.event).toBe('http_error')
    expect(parsed.status).toBe(404)
    expect(parsed.method).toBe('GET')
    expect(parsed.path).toBe('/api/v1/upload/file')
    expect(parsed.error).toBe('NotFoundException')
    expect(parsed.correlationId).toBe('cid-test-1')
  })

  it('logs 5xx at error level and keeps the problem detail generic', () => {
    const { host, status, json } = makeHost('/api/v1/trips')
    new GlobalExceptionFilter().catch(new Error('boom-internal'), host)

    expect(status).toHaveBeenCalledWith(500)
    const parsed = JSON.parse(jsonLineFrom(errorSpy))
    expect(parsed.event).toBe('http_error')
    expect(parsed.status).toBe(500)
    const problem = json.mock.calls[0][0] as { detail: string }
    expect(problem.detail).toBe('An unexpected error occurred.')
    expect(JSON.stringify(problem)).not.toContain('boom-internal')
  })

  it('preserves validation errors in the problem body', () => {
    const { host, json } = makeHost('/api/v1/auth/login')
    new GlobalExceptionFilter().catch(
      new BadRequestException(['email must be an email']),
      host
    )

    const problem = json.mock.calls[0][0] as {
      errors?: Record<string, string[]>
    }
    expect(problem.errors?.validation).toEqual(['email must be an email'])
    expect(JSON.parse(jsonLineFrom(warnSpy)).status).toBe(400)
  })

  it('strips the query string from the problem instance (#437)', () => {
    const { host, json } = makeHost('/api/v1/media/download?token=<redacted>')
    new GlobalExceptionFilter().catch(new NotFoundException('nope'), host)

    const problem = json.mock.calls[0][0] as { instance: string }
    expect(problem.instance).toBe('/api/v1/media/download')
    expect(JSON.stringify(problem)).not.toContain('supersecret')
  })

  it('keeps the problem instance unchanged without a query string (#437)', () => {
    const { host, json } = makeHost('/api/v1/trips')
    new GlobalExceptionFilter().catch(new NotFoundException('nope'), host)

    const problem = json.mock.calls[0][0] as { instance: string }
    expect(problem.instance).toBe('/api/v1/trips')
  })
})
