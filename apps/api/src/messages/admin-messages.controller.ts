import { Body, Controller, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MessagesService } from './messages.service';
import { RemoveMessageAttachmentDto } from './dto/remove-message-attachment.dto';

/**
 * #251 (Council B23) — admin moderation of message attachments.
 * Identity documents and payment credentials must not live in chat:
 * the send path rejects private uploads, the messaging UI warns
 * against sending them, and this endpoint is the removal lever when
 * something sensitive lands anyway — it tombstones the attachment URL
 * and deletes the stored object, with a mandatory reason and an
 * AuditLog row (see MessagesService.removeMessageAttachmentAsAdmin).
 */
@ApiTags('AdminMessages')
@Controller('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminMessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Delete('messages/:messageId/attachment')
    @ApiOperation({ summary: 'Remove a message attachment: tombstone the URL and delete the stored object' })
    removeMessageAttachment(
        @Request() req: any,
        @Param('messageId') messageId: string,
        @Body() dto: RemoveMessageAttachmentDto,
    ) {
        return this.messagesService.removeMessageAttachmentAsAdmin(
            messageId,
            { id: req.user.userId, email: req.user.email ?? null },
            dto.reason,
        );
    }
}
