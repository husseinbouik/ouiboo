import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, dto: NotificationPreferenceDto) {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });

    return preferences;
  }

  /**
   * Get notification logs for a user
   */
  async getNotificationHistory(userId: string, limit: number = 50, page: number = 1) {
    const safeLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.floor(limit)))
      : 50;
    const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
    const where = { userId };
    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId: string) {
    const count = await this.prisma.notificationLog.count({
      where: {
        userId,
        status: 'SENT',
      },
    });

    return count;
  }
}
