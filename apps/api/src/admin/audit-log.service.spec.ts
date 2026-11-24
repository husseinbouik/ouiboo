import { AuditLogService } from './audit-log.service'

/**
 * #1019 (B5): AuditLogService had no spec despite being the write path
 * for the admin/booking audit trail (see also B7 — audit failures are
 * only as visible as this service's behaviour).
 */
describe('AuditLogService (#1019)', () => {
  const createDb = () => ({
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
  })

  it('writes the payload to the audit log and returns the created row', async () => {
    const db = createDb()
    const service = new AuditLogService(db as never)

    const result = await service.log({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      action: 'AGENCY_VERIFIED',
      targetType: 'AGENCY',
      targetId: 'agency-1',
      metadata: { decision: 'VERIFIED' },
    })

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'AGENCY_VERIFIED',
        targetType: 'AGENCY',
        targetId: 'agency-1',
        metadata: { decision: 'VERIFIED' },
      },
    })
    expect(result).toEqual({ id: 'log-1' })
  })

  it('stores undefined metadata when the payload carries none or null', async () => {
    const db = createDb()
    const service = new AuditLogService(db as never)

    await service.log({ action: 'LOGIN', targetType: 'USER' })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ metadata: undefined }),
    })

    await service.log({ action: 'LOGIN', targetType: 'USER', metadata: null })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ metadata: undefined }),
    })
  })

  it('propagates a database failure to the caller instead of swallowing it', async () => {
    const db = createDb()
    db.auditLog.create.mockRejectedValue(new Error('db unavailable'))
    const service = new AuditLogService(db as never)

    await expect(
      service.log({ action: 'LOGIN', targetType: 'USER' })
    ).rejects.toThrow('db unavailable')
  })
})
