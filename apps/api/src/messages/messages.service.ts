import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    senderRole: string,
    dto: SendMessageDto,
  ) {
    // Determine IDs based on role
    const travelerId =
      senderRole === 'TRAVELER' ? senderId : dto.recipientId;
    const agencyId =
      senderRole === 'AGENCY' ? senderId : dto.recipientId;

    // Get or create conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        travelerId_agencyId: {
          travelerId,
          agencyId,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          travelerId,
          agencyId,
        },
      });
    }

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

    return message;
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
    const skip = (page - 1) * limit;

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
        take: limit,
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
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get conversations for a user
   */
  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

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
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      total,
      page,
      pages: Math.ceil(total / limit),
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
    const skip = (page - 1) * limit;

    const agency = await this.prisma.agencyProfile.findUnique({
      where: { userId },
    });

    const where =
      agency
        ? {
            conversation: { agencyId: agency.id },
            content: { contains: query, mode: 'insensitive' as const },
          }
        : {
            conversation: { travelerId: userId },
            content: { contains: query, mode: 'insensitive' as const },
          };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      messages,
      total,
      page,
      pages: Math.ceil(total / limit),
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

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }
}
