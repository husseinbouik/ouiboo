import { Injectable, BadRequestException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
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

    // #754 (Council S7-2): messaging eligibility is defined by the
    // pair's lifecycle. A traveller may open a pre-booking inquiry with
    // any agency (bounded by the rate limits below); once a booking or
    // quote relationship exists the conversation is booking-linked.
    // An AGENCY may never cold-start: without an existing conversation
    // it needs a booking or quote relationship with the traveller —
    // otherwise it is reply-only.
    const existingConversation = await this.prisma.conversation.findUnique({
      where: { travelerId_agencyId: { travelerId, agencyId } },
      select: { id: true },
    });
    const pairBookings = await this.countPairBookings(travelerId, agencyId);

    if (senderRole === UserRole.Agency && !existingConversation) {
      const pairQuotes = await this.prisma.quoteRequest.count({
        where: { travelerId, agencyId },
      });
      if (pairBookings === 0 && pairQuotes === 0) {
        throw new ForbiddenException(
          'Agencies can only message travellers they have a booking or quote relationship with',
        );
      }
    }

    // #729/#754: a traveller's block of the agency freezes the pair —
    // no new conversation may start, and an existing conversation
    // without a live booking accepts no further sends from either
    // side. A booking-linked conversation stays usable for that
    // booking (the block never strands an active trip).
    const block = await this.prisma.agencyBlock.findUnique({
      where: { travelerId_agencyId: { travelerId, agencyId } },
      select: { id: true },
    });
    if (block && pairBookings === 0) {
      throw new ForbiddenException(
        'This conversation is blocked. Booking-linked conversations stay available from the booking page.',
      );
    }

    if (dto.attachmentUrl) {
      await this.assertMessageAttachmentAllowed(dto.attachmentUrl, agencyId, senderId, senderRole);
    }

    // #754: per-conversation burst cap, counted in the database (not
    // process memory) on top of the distributed per-user limiter on
    // POST /messages (#758). Returns a plain 429 problem response.
    if (existingConversation) {
      const recentSends = await this.prisma.message.count({
        where: {
          conversationId: existingConversation.id,
          senderId,
          createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
        },
      });
      if (recentSends >= 50) {
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
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
      contactExchangeCategories.length > 0 && pairBookings === 0;

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

    const [agency, traveler, block] = await Promise.all([
      this.prisma.agencyProfile.findUnique({
        where: { id: conversation.agencyId },
        select: { id: true, companyName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: conversation.travelerId },
        select: { id: true, name: true },
      }),
      this.prisma.agencyBlock.findUnique({
        where: {
          travelerId_agencyId: {
            travelerId: conversation.travelerId,
            agencyId: conversation.agencyId,
          },
        },
        select: { id: true },
      }),
    ]);

    return {
      messages,
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
      conversation: {
        id: conversation.id,
        travelerId: conversation.travelerId,
        travelerName: traveler?.name ?? null,
        agencyId: conversation.agencyId,
        agencyName: agency?.companyName ?? null,
        // #729: whether the TRAVELLER has blocked this agency (drives
        // the block/unblock control + the frozen-conversation notice).
        agencyBlocked: Boolean(block),
      },
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
          agency: { select: { id: true, companyName: true } },
          traveler: { select: { id: true, name: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Per-conversation unread counts + (for traveller viewers) block
    // flags, so both inboxes can render badges and frozen states
    // without extra round-trips.
    const enriched = await Promise.all(
      conversations.map(async (conversation) => {
        const [unreadCount, block] = await Promise.all([
          this.prisma.message.count({
            where: {
              conversationId: conversation.id,
              isRead: false,
              senderId: { not: userId },
            },
          }),
          agency
            ? Promise.resolve(null)
            : this.prisma.agencyBlock.findUnique({
                where: {
                  travelerId_agencyId: {
                    travelerId: userId,
                    agencyId: conversation.agencyId,
                  },
                },
                select: { id: true },
              }),
        ]);
        return { ...conversation, unreadCount, agencyBlocked: Boolean(block) };
      }),
    );

    return {
      conversations: enriched,
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
   * Message attachments (#251 — Council B23; #629/#754 completion):
   * an attachment must reference a file uploaded to Ouiboo, it must
   * never be a private upload, and it must belong to THIS
   * conversation's agency (trips/{agencyId}/ keys only). Private
   * uploads are identity documents, payment proofs and refund
   * evidence — exactly the document classes that must not enter
   * the platform through chat, and payment-proof-style images belong
   * to the booking flow, never to messages. (Detecting "this image
   * is an ID document" is not reliable, so the rule is enforced at
   * the storage-class + tenant boundary, paired with the in-app
   * no-ID-documents notice, a moderation flag on every blocked
   * attempt, and the admin removal action below.)
   */
  private async assertMessageAttachmentAllowed(
    attachmentUrl: string,
    agencyId: string,
    senderId: string,
    senderRole: string,
  ): Promise<void> {
    const key = this.uploadService.resolveStorageKey(attachmentUrl);
    // #629/#754: classify the failure WITHOUT keeping the reference —
    // the moderation flag records the class only (an external URL or a
    // private key can itself carry personal data).
    let failureClass: 'EXTERNAL_URL' | 'PRIVATE_DOCUMENT' | 'OTHER_TENANT' | null = null;
    if (!key) {
      failureClass = 'EXTERNAL_URL';
    } else if (key.startsWith(`${PRIVATE_FILE_PREFIX}/`)) {
      failureClass = 'PRIVATE_DOCUMENT';
    } else if (!key.startsWith(`trips/${agencyId}/`)) {
      // Storage-bound AND tenant-bound: the only attachable uploads are
      // the conversation agency's own catalogue uploads. Another
      // agency's public asset is not this pair's to send.
      failureClass = 'OTHER_TENANT';
    }
    if (!failureClass) return;

    await this.recordAttachmentBlocked(senderId, senderRole, failureClass);
    if (failureClass === 'PRIVATE_DOCUMENT') {
      throw new BadRequestException('Private documents cannot be sent as message attachments');
    }
    throw new BadRequestException('Attachment must reference a file uploaded to Ouiboo for this conversation');
  }

  /**
   * #629: moderation flag for a blocked attachment attempt. Best-effort
   * (a failed audit write must not mask the 400 the sender receives)
   * and content-free: storage class + sender role only, never the URL,
   * key, or file name — the attempt itself is the abuse signal the
   * moderation queue investigates via the audit trail (#754).
   */
  private async recordAttachmentBlocked(
    senderId: string,
    senderRole: string,
    storageClass: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: senderId,
          action: 'MESSAGE_ATTACHMENT_BLOCKED',
          targetType: 'MESSAGE',
          metadata: { storageClass, senderRole },
        },
      });
    } catch {
      // The rejection stands either way; the flag is a signal.
    }
  }

  /**
   * #729/#754: one-tap report of a conversation by either participant.
   * The report row is the moderation queue's input; an AuditLog row is
   * written in the same transaction. Reason is a coarse category and
   * details are the reporter's own words about the conversation —
   * message content is never copied into either record.
   */
  async reportConversation(
    conversationId: string,
    reporterId: string,
    dto: { reason: string; details?: string },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }
    await this.assertConversationParticipant(conversation, reporterId);

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conversationReport.create({
        data: {
          conversationId,
          reporterId,
          reason: dto.reason,
          details: dto.details?.trim() ? dto.details.trim() : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: reporterId,
          action: 'CONVERSATION_REPORTED',
          targetType: 'CONVERSATION',
          targetId: conversationId,
          metadata: { reason: dto.reason },
        },
      });
      return created;
    });

    return { id: report.id, status: 'RECEIVED' as const };
  }

  /**
   * #729/#754: traveller blocks an agency. Enforcement lives in
   * sendMessage (no new conversations; non-booking conversations
   * frozen; booking-linked conversations stay usable). Idempotent.
   */
  async blockAgency(travelerId: string, agencyId: string) {
    const agency = await this.prisma.agencyProfile.findUnique({
      where: { id: agencyId },
      select: { id: true },
    });
    if (!agency) {
      throw new BadRequestException('Agency not found');
    }
    await this.prisma.agencyBlock.upsert({
      where: { travelerId_agencyId: { travelerId, agencyId } },
      update: {},
      create: { travelerId, agencyId },
    });
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: travelerId,
          action: 'AGENCY_BLOCKED_BY_TRAVELER',
          targetType: 'AGENCY',
          targetId: agencyId,
          metadata: {},
        },
      });
    } catch {
      // The block stands either way; the audit row is a signal.
    }
    return { blocked: true as const, agencyId };
  }

  /** Traveller lifts a block. Idempotent. */
  async unblockAgency(travelerId: string, agencyId: string) {
    await this.prisma.agencyBlock.deleteMany({ where: { travelerId, agencyId } });
    return { blocked: false as const, agencyId };
  }

  /** The traveller's current blocks (drives the conversation UI). */
  async listBlocks(travelerId: string) {
    const blocks = await this.prisma.agencyBlock.findMany({
      where: { travelerId },
      include: { agency: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { blocks };
  }

  private async assertConversationParticipant(
    conversation: { travelerId: string; agencyId: string },
    userId: string,
  ): Promise<void> {
    if (userId === conversation.travelerId) return;
    const agency = await this.prisma.agencyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (agency?.id === conversation.agencyId) return;
    throw new ForbiddenException('Not authorized to access this conversation');
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
