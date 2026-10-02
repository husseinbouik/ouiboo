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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  /**
   * Send a message
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
