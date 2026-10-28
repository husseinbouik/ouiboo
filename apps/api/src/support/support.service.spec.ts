import { NotFoundException } from '@nestjs/common';
import { SupportService } from './support.service';

describe('SupportService (#446)', () => {
  const created: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  let stored: Record<string, unknown> | null;
  const db = {
    supportTicket: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: 'ticket-1', status: 'OPEN', createdAt: new Date('2026-10-28T09:00:00.000Z'), ...data };
      }),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => stored),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { id: 'ticket-1', ...stored, ...data };
      }),
    },
  };
  const service = new SupportService(db as never);

  const validDto = {
    requesterName: '  Amine Traveller ',
    requesterEmail: 'Amine@Example.com',
    requesterRole: 'TRAVELER' as const,
    category: 'BOOKING' as const,
    subject: ' Booking still pending ',
    message: 'I uploaded my payment proof and the booking is still pending.',
    bookingRef: ' bk-123 ',
  };

  beforeEach(() => {
    created.length = 0;
    updates.length = 0;
    jest.clearAllMocks();
    stored = { id: 'ticket-1', status: 'OPEN', firstResponseAt: null, resolvedAt: null };
    db.supportTicket.findUnique.mockImplementation(async () => stored);
    db.supportTicket.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      created.push(data);
      return { id: 'ticket-1', status: 'OPEN', createdAt: new Date('2026-10-28T09:00:00.000Z'), ...data };
    });
    db.supportTicket.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      updates.push(data);
      return { id: 'ticket-1', ...stored, ...data };
    });
  });

  it('stores a ticket trimmed, with a normalised email and no invented defaults beyond GUEST/OTHER fallbacks', async () => {
    const result = await service.createTicket(validDto);
    expect(result).toMatchObject({ id: 'ticket-1', status: 'OPEN' });
    expect(created[0]).toMatchObject({
      requesterName: 'Amine Traveller',
      requesterEmail: 'amine@example.com',
      subject: 'Booking still pending',
      bookingRef: 'bk-123',
    });

    await service.createTicket({ requesterName: 'Guest', requesterEmail: 'g@example.com', subject: 'Help', message: 'I need help with my account please.' });
    expect(created[1]).toMatchObject({ requesterRole: 'GUEST', category: 'OTHER', bookingRef: null });
  });

  it('stamps firstResponseAt exactly once, on the first move out of OPEN', async () => {
    const now = new Date('2026-10-28T12:00:00.000Z');
    await service.updateTicket('ticket-1', { status: 'IN_PROGRESS' }, 'admin-1', now);
    expect(updates[0]).toMatchObject({ status: 'IN_PROGRESS', firstResponseAt: now });

    stored = { id: 'ticket-1', status: 'IN_PROGRESS', firstResponseAt: now, resolvedAt: null };
    await service.updateTicket('ticket-1', { status: 'RESOLVED' }, 'admin-1', new Date('2026-10-29T12:00:00.000Z'));
    expect(updates[1]).not.toHaveProperty('firstResponseAt');
    expect(updates[1]).toMatchObject({ status: 'RESOLVED', resolvedBy: 'admin-1' });
    expect((updates[1] as { resolvedAt: Date }).resolvedAt).toEqual(new Date('2026-10-29T12:00:00.000Z'));
  });

  it('reopening a resolved ticket clears the resolution stamp but keeps the first response', async () => {
    stored = { id: 'ticket-1', status: 'RESOLVED', firstResponseAt: new Date(), resolvedAt: new Date(), resolvedBy: 'admin-1' };
    await service.updateTicket('ticket-1', { status: 'OPEN' }, 'admin-1');
    // status OPEN never counts as a first response, and the resolution is cleared
    expect(updates[0]).toMatchObject({ status: 'OPEN', resolvedAt: null, resolvedBy: null });
    expect(updates[0]).not.toHaveProperty('firstResponseAt');
  });

  it('throws for an unknown ticket id', async () => {
    stored = null;
    await expect(service.updateTicket('nope', { status: 'RESOLVED' }, 'admin-1')).rejects.toThrow(NotFoundException);
  });
});
