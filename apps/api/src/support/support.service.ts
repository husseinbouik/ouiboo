import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSupportTicketDto, UpdateSupportTicketDto } from './dto/support.dto';

/**
 * #446 (Council P2-07): help-centre tickets.
 *
 * The ticket is a stored support request, not a new support promise:
 * the normal lane still answers within 48 hours (#419) and an
 * active-trip emergency still goes to the agency first. What changes
 * is only that a first response can now be timestamped, so the beta
 * metrics service can derive the 48-hour first-response rate from
 * tickets instead of reporting it as not derivable.
 */
@Injectable()
export class SupportService {
  constructor(private db: DatabaseService) {}

  async createTicket(dto: CreateSupportTicketDto) {
    const ticket = await this.db.supportTicket.create({
      data: {
        requesterName: dto.requesterName.trim(),
        requesterEmail: dto.requesterEmail.trim().toLowerCase(),
        requesterRole: (dto.requesterRole ?? 'GUEST') as never,
        category: (dto.category ?? 'OTHER') as never,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        bookingRef: dto.bookingRef?.trim() ? dto.bookingRef.trim() : null,
      },
    });
    return { id: ticket.id, status: ticket.status, createdAt: ticket.createdAt };
  }

  async listTickets(status?: string, category?: string) {
    const where: Record<string, unknown> = {};
    if (status?.trim()) where.status = status.trim().toUpperCase();
    if (category?.trim()) where.category = category.trim().toUpperCase();
    return this.db.supportTicket.findMany({
      where: Object.keys(where).length > 0 ? (where as never) : undefined,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
  }

  /**
   * Admin handling of a ticket. The first time a ticket leaves OPEN,
   * that moment is its first response (firstResponseAt, set once and
   * never overwritten). RESOLVED / CLOSED stamp resolvedAt + the
   * acting admin; reopening (back to OPEN / IN_PROGRESS) clears the
   * resolution stamp but keeps the original first response.
   */
  async updateTicket(id: string, dto: UpdateSupportTicketDto, adminId: string, now: Date = new Date()) {
    const ticket = await this.db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    const isResolved = dto.status === 'RESOLVED' || dto.status === 'CLOSED';
    const data: Record<string, unknown> = { status: dto.status };
    if (!ticket.firstResponseAt && dto.status !== 'OPEN') {
      data.firstResponseAt = now;
    }
    if (isResolved) {
      data.resolvedAt = now;
      data.resolvedBy = adminId;
    } else if (ticket.resolvedAt) {
      data.resolvedAt = null;
      data.resolvedBy = null;
    }
    return this.db.supportTicket.update({ where: { id }, data: data as never });
  }
}
