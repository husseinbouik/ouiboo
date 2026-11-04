import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ReportConversationDto } from './dto/report-conversation.dto';
import { BlockAgencyDto } from './dto/block-agency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard, RateLimitSensitive } from '../common/rate-limit.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  /**
   * Send a message
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  // Messaging can be used to solicit off-platform payment or to spam an
  // agency.  Keep the limit distributed and fail closed when Redis is down;
  // this is intentionally stricter than a best-effort process-local limit.
  @RateLimit({ points: 20, windowMs: 60_000, keyPrefix: 'messages:send' })
  @RateLimitSensitive()
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.sendMessage(req.user.id, req.user.role, dto);
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req: any,
  ) {
    return this.messagesService.getMessages(
      conversationId,
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Get all conversations for user
   */
  @Get('conversations')
  async getConversations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req: any,
  ) {
    return this.messagesService.getConversations(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Get unread message count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.messagesService.getUnreadCount(req.user.id);
    return { unreadCount: count };
  }

  /**
   * Search messages
   */
  @Get('search')
  async searchMessages(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req: any,
  ) {
    return this.messagesService.searchMessages(
      req.user.id,
      query,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Report a conversation (#729/#754 — one-tap safety path; either
   * participant may report, the report feeds the moderation queue).
   */
  @Post('conversations/:conversationId/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'messages:report' })
  @RateLimitSensitive()
  async reportConversation(
    @Param('conversationId') conversationId: string,
    @Body() dto: ReportConversationDto,
    @Request() req: any,
  ) {
    return this.messagesService.reportConversation(conversationId, req.user.id, dto);
  }

  /**
   * Block an agency (#729/#754 — traveller-only; enforcement in the
   * service: no new conversations, non-booking conversations frozen,
   * booking-linked conversations stay usable for that booking).
   */
  @Post('blocks')
  @HttpCode(HttpStatus.CREATED)
  async blockAgency(@Body() dto: BlockAgencyDto, @Request() req: any) {
    return this.messagesService.blockAgency(req.user.id, dto.agencyId);
  }

  /** Lift a block. */
  @Delete('blocks/:agencyId')
  async unblockAgency(@Param('agencyId') agencyId: string, @Request() req: any) {
    return this.messagesService.unblockAgency(req.user.id, agencyId);
  }

  /** The traveller's current blocks. */
  @Get('blocks')
  async listBlocks(@Request() req: any) {
    return this.messagesService.listBlocks(req.user.id);
  }

  /**
   * Delete message
   */
  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    return this.messagesService.deleteMessage(messageId, req.user.id);
  }
}
