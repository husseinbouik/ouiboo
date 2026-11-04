import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import {
  SubscribePushDto,
  UnsubscribePushDto,
} from './dto/push-subscription.dto';
import { NotificationsService } from './notifications.service';
import { PushNotificationsService } from './push-notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

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
  getHistory(@Request() req: any, @Query('limit') limit?: string, @Query('page') page?: string) {
    return this.notificationsService.getNotificationHistory(
      req.user.id,
      limit ? Number(limit) : 50,
      page ? Number(page) : 1,
    );
  }

  // #784: web push. All subscription mutations are scoped to the
  // authenticated user — there is no way to read or remove another
  // user's subscriptions through these endpoints.
  @Get('push/public-key')
  @ApiOperation({ summary: 'Get the VAPID public key for browser push subscriptions' })
  getPushPublicKey() {
    return this.pushNotificationsService.getPublicKey();
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Subscribe the current browser for web push' })
  subscribePush(@Request() req: any, @Body() dto: SubscribePushDto) {
    return this.pushNotificationsService.subscribe(req.user.id, dto);
  }

  @Post('push/unsubscribe')
  @ApiOperation({ summary: 'Remove the current browser web push subscription' })
  unsubscribePush(@Request() req: any, @Body() dto: UnsubscribePushDto) {
    return this.pushNotificationsService.unsubscribe(req.user.id, dto.endpoint);
  }
}
