import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UploadService } from '../upload/upload.service';
import { PRIVATE_FILE_PREFIX } from '../upload/upload.constants';
import { UserRole } from '@ouiboo/types';
import {
  CONTACT_EXCHANGE_AUDIT_ACTION,
  detectContactExchange,
  type ContactExchangeCategory,
} from './contact-exchange.util';

const normalizePagination = (page: number, limit: number, max: number) => ({
  page: Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1,
  limit: Number.isFinite(limit) ? Math.min(max, Math.max(1, Math.floor(limit))) : Math.min(20, max),
});

@Injectable()
export class MessagesService {
  constructor(
    private prisma: DatabaseService,
    private uploadService: UploadService,
  ) {}

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    senderRole: string,
    dto: SendMessageDto,
  ) {
    let travelerId: string;
    let agencyId: string;
    if (senderRole === UserRole.Agency) {
      const [agency, traveler] = await Promise.all([
        this.prisma.agencyProfile.findUnique({ where: { userId: senderId }, select: { id: true } }),
        this.prisma.user.findFirst({
          where: { id: dto.recipientId, role: UserRole.Traveler, isEmailVerified: true },
          select: { id: true },
        }),
      ]);
      if (!agency || !traveler) throw new BadRequestException('Message recipient not found');
      agencyId = agency.id;
      travelerId = traveler.id;
    } else if (senderRole === UserRole.Traveler) {
      const agency = await this.prisma.agencyProfile.findUnique({
        where: { id: dto.recipientId },
        select: { id: true },
      });
      if (!agency) throw new BadRequestException('Message recipient not found');
      agencyId = agency.id;
      travelerId = senderId;
    } else {
      throw new ForbiddenException('This account cannot start conversations');
    }

    if (dto.attachmentUrl) {
      this.assertMessageAttachmentAllowed(dto.attachmentUrl);
    }

    // #444 (Council P2-05): leakage detection. Contact exchange is by
    // design AFTER a booking exists, so detection only runs for a pair
    // with no live booking — and it never blocks the message. A flagged
    // send is delivered, the sender gets a keep-it-on-Ouiboo warning in
    // the response, and an audit row records the CATEGORIES seen
    // (never the matched text) as a fee-capture signal for the leakage
    // report (analytics/leakage-detection.service.ts).
    const contactExchangeCategories = detectContactExchange(dto.content);
    const isPreBookingExchange =
      contactExchangeCategories.length > 0 &&
      (await this.countPairBookings(travelerId, agencyId)) === 0;

    // Get or create conversation
    const conversation = await this.prisma.conversation.upsert({
      where: {
        travelerId_agencyId: {
          travelerId,
          agencyId,
        },
      },
      update: {},
      create: { travelerId, agencyId },
    });

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
      },
      include: {
        conversation: true,
      },
    });

    // Update conversation last message time
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (!isPreBookingExchange) {
      return message;
    }

    await this.recordContactExchangeDetection(
      senderId,
      conversation.id,
      contactExchangeCategories,
      senderRole,
    );

    return {
      ...message,
      contactExchange: {
        detected: true,
        phase: 'PRE_BOOKING' as const,
        categories: contactExchangeCategories,
      },
    };
  }

  /**
   * #444: live bookings between one traveller and one agency (any
   * status except CANCELLED/REJECTED — a pair whose only booking was
   * cancelled has no booking relationship to protect, so pre-booking
   * rules apply to it again).
   */
  private async countPairBookings(travelerId: string, agencyId: string): Promise<number> {
    return this.prisma.booking.count({
      where: {
        travelerId,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
        session: { template: { agencyId } },
      },
    });
  }

  /**
   * #444: record a pre-booking contact-exchange detection in the
   * AuditLog. Categories and phase only — the message content and the
   * matched values are NEVER written here (they are contact/bank data,
   * which must not be copied into logs). Best-effort: a failed audit
   * write must never fail the message send.
   */
  private async recordContactExchangeDetection(
    senderId: string,
    conversationId: string,
    categories: ContactExchangeCategory[],
    senderRole: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: senderId,
          action: CONTACT_EXCHANGE_AUDIT_ACTION,
          targetType: 'CONVERSATION',
          targetId: conversationId,
          metadata: { categories, phase: 'PRE_BOOKING', senderRole },
        },
      });
    } catch {
      // Detection is a signal, not a gate: the message already sent.
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const pagination = normalizePagination(page, limit, 100);
    const skip = (pagination.page - 1) * pagination.limit;

    // Verify user has access to conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    // Check if user is part of conversation
    const userAgent = await this.prisma.agencyProfile.findUnique({
      where: { userId },
    });
    const isAgency = userAgent?.id === conversation.agencyId;
    const isTraveler = userId === conversation.travelerId;

    if (!isAgency && !isTraveler) {
      throw new ForbiddenException(
        'Not authorized to access this conversation',
      );
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.message.count({
        where: { conversationId },
      }),
    ]);

    // Mark messages as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        isRead: false,
        senderId: { not: userId },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      messages,
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Get conversations for a user
   */
  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const pagination = normalizePagination(page, limit, 50);
    const skip = (pagination.page - 1) * pagination.limit;

    // Get agency ID if user is agency
    const agency = await this.prisma.agencyProfile.findUnique({
      where: { userId },
    });

    const where =
      agency
        ? { agencyId: agency.id }
        : { travelerId: userId };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const agency = await this.prisma.agencyProfile.findUnique({
      where: { userId },
    });

    let count = 0;

    if (agency) {
      // Count unread messages where recipient is this agency
      count = await this.prisma.message.count({
        where: {
          conversation: { agencyId: agency.id },
          isRead: false,
          senderId: { not: userId },
        },
      });
    } else {
      // Count unread messages where recipient is this traveler
      count = await this.prisma.message.count({
        where: {
          conversation: { travelerId: userId },
          isRead: false,
          senderId: { not: userId },
        },
      });
    }

    return count;
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) throw new BadRequestException('Search query is required');
    const pagination = normalizePagination(page, limit, 50);
    const skip = (pagination.page - 1) * pagination.limit;

    const agency = await this.prisma.agencyProfile.findUnique({
      where: { userId },
    });

    const where =
      agency
        ? {
            conversation: { agencyId: agency.id },
            content: { contains: normalizedQuery, mode: 'insensitive' as const },
          }
        : {
            conversation: { travelerId: userId },
            content: { contains: normalizedQuery, mode: 'insensitive' as const },
          };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      messages,
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Delete message
   */
  async deleteMessage(
    messageId: string,
    userId: string,
  ): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new BadRequestException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Not authorized to delete this message');
    }

    // Deleting the row must not orphan the stored attachment object.
    if (message.attachmentUrl) {
      await this.deleteAttachmentObject(message.attachmentUrl);
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  /**
   * Message attachments (#251 — Council B23): an attachment must
   * reference a file uploaded to Ouiboo, and it must never be a private
   * upload. Private uploads are identity documents, payment proofs and
   * refund evidence — exactly the document classes that must not enter
   * the platform through chat. Public trip-asset uploads are the only
   * legitimate attachment shape. (Detecting "this image is an ID
   * document" is not reliable, so the beta rule is enforced at the
   * storage-class boundary and paired with the in-app warning and the
   * admin removal action below.)
   */
  private assertMessageAttachmentAllowed(attachmentUrl: string): void {
    const key = this.uploadService.resolveStorageKey(attachmentUrl);
    if (!key) {
      throw new BadRequestException('Attachment must reference a file uploaded to Ouiboo');
    }
    if (key.startsWith(`${PRIVATE_FILE_PREFIX}/`)) {
      throw new BadRequestException('Private documents cannot be sent as message attachments');
    }
  }

  /** Best-effort storage cleanup for a message attachment object. */
  private async deleteAttachmentObject(attachmentUrl: string): Promise<boolean> {
    try {
      return await this.uploadService.deleteFileByReference(attachmentUrl);
    } catch {
      return false;
    }
  }

  /**
   * Admin moderation (#251 — Council B23): remove a message attachment.
   * The URL is tombstoned on the row (set to null) and the stored
   * object is deleted; the message text itself is left untouched.
   * A written reason is mandatory and the removal is recorded in the
   * AuditLog in the same transaction as the tombstone. The object
   * deletion is attempted first so the audit row records its true
   * outcome; if the database write then failed, the attachment would
   * fail to load rather than stay reachable — the safer direction for
   * a moderation action.
   */
  async removeMessageAttachmentAsAdmin(
    messageId: string,
    actor: { id: string; email?: string | null },
    reason: string,
  ) {
    const trimmedReason = (reason ?? '').trim();
    if (!trimmedReason) {
      throw new BadRequestException('A reason is required to remove a message attachment');
    }

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new BadRequestException('Message not found');
    }
    if (!message.attachmentUrl) {
      throw new BadRequestException('Message has no attachment');
    }

    const storageKey = this.uploadService.resolveStorageKey(message.attachmentUrl);
    const storageDeleted = await this.deleteAttachmentObject(message.attachmentUrl);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.message.update({
        where: { id: messageId },
        data: { attachmentUrl: null },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email ?? undefined,
          action: 'MESSAGE_ATTACHMENT_REMOVED',
          targetType: 'MESSAGE',
          targetId: messageId,
          metadata: { reason: trimmedReason, storageKey, storageDeleted },
        },
      });
      return updated;
    });
  }
}
