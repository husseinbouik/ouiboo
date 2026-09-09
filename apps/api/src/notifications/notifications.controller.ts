import { Body, Controller, Get, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  updatePreferences(@Request() req: any, @Body() dto: NotificationPreferenceDto) {
    return this.notificationsService.updatePreferences(req.user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get current user notification history' })
  getHistory(@Request() req: any, @Query('limit') limit?: string) {
    return this.notificationsService.getNotificationHistory(
      req.user.id,
      limit ? Number(limit) : 50,
    );
  }
}
