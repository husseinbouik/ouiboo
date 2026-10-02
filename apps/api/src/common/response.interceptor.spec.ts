import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'
import { ResponseInterceptor } from './response.interceptor'

describe('ResponseInterceptor', () => {
  const context = (accept = 'application/vnd.ouiboo.v2+json') =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { accept } }),
      }),
    }) as ExecutionContext

  const intercept = (value: unknown, accept?: string) =>
    lastValueFrom(
      new ResponseInterceptor().intercept(context(accept), {
        handle: () => of(value),
      } as CallHandler)
    )

  it('preserves the legacy response unless v2 is requested', async () => {
    const legacy = { id: 'trip-1' }
    await expect(intercept(legacy, 'application/json')).resolves.toBe(legacy)
  })

  it('wraps a regular response', async () => {
    await expect(intercept({ id: 'trip-1' })).resolves.toEqual(
      expect.objectContaining({
        success: true,
        data: { id: 'trip-1' },
        timestamp: expect.any(String),
      })
    )
  })

  it('promotes legacy pagination into meta', async () => {
    const result = await intercept({
      data: [{ id: 'trip-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: [{ id: 'trip-1' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
    )
  })

  it('does not double-wrap an existing envelope', async () => {
    const envelope = {
      success: true as const,
      data: ['ok'],
      timestamp: '2026-07-24T10:20:00.000Z',
    }
    await expect(intercept(envelope)).resolves.toBe(envelope)
  })
})
