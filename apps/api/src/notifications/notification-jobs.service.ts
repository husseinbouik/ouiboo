import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { NotificationType } from '@ouiboo/database';

type NotificationMap = Record<string, string>;

const getNotificationState = (value: unknown): NotificationMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as NotificationMap;
};

@Injectable()
export class NotificationJobsService {
  private readonly logger = new Logger(NotificationJobsService.name);

  constructor(
    private prisma: DatabaseService,
    private emailService: EmailService,
  ) {}

  /**
   * Send payment proof reminders - every 12 hours for unpaid bookings
   */
  async sendPaymentProofReminders() {
    this.logger.log('Running payment proof reminder job');
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: 'AWAITING_VALIDATION',
          paymentStatus: 'UNPAID',
          createdAt: {
            lt: twelveHoursAgo,
          },
          lastReminderSentAt: null,
        },
        include: {
          traveler: true,
          session: { include: { template: true } },
        },
      });

      for (const booking of bookings) {
        try {
          const bookingDashboardUrl = `${process.env.TRAVELER_APP_URL}/bookings/${booking.id}`;
          const hoursRemaining = 12;
          
          await this.emailService.sendPaymentReminder(
            booking.traveler.email,
            booking.session.template.title,
            hoursRemaining,
            bookingDashboardUrl,
          );

          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              lastReminderSentAt: new Date(),
              notificationsSent: {
                ...getNotificationState(booking.notificationsSent),
                paymentReminder: new Date().toISOString(),
              },
            },
          });

          await this.createNotificationLog(
            booking.travelerId,
            'PAYMENT_REMINDER',
            booking.traveler.email,
            `Payment reminder sent for booking ${booking.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send payment reminder for booking ${booking.id}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Payment proof reminder job failed', error);
    }
  }

  /**
   * Send trip reminders - 7 days before departure
   */
  async sendTripReminders7DaysBefore() {
    this.logger.log('Running 7-day trip reminder job');
    try {
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const sevenDaysPlus1 = new Date(
        Date.now() + 8 * 24 * 60 * 60 * 1000,
      );

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          session: {
            startDate: {
              gte: sevenDaysLater,
              lt: sevenDaysPlus1,
            },
          },
        },
        include: {
          traveler: true,
          session: {
            include: {
              template: {
                include: {
                  agency: true,
                },
              },
            },
          },
        },
      });

      for (const booking of bookings) {
        try {
          const notificationsSent = getNotificationState(booking.notificationsSent);
          if (!notificationsSent.tripReminder7Days) {
            const tripDetailsUrl = `${process.env.TRAVELER_APP_URL}/trip/${booking.session.template.id}`;
            
            await this.emailService.sendTripReminder(
              booking.traveler.email,
              booking.session.template.title,
              7,
              booking.session.template.agency.companyName,
              tripDetailsUrl,
            );

            await this.prisma.booking.update({
              where: { id: booking.id },
              data: {
                notificationsSent: {
                  ...notificationsSent,
                  tripReminder7Days: new Date().toISOString(),
                },
              },
            });

            await this.createNotificationLog(
              booking.travelerId,
              'TRIP_REMINDER',
              booking.traveler.email,
              `7-day trip reminder sent for booking ${booking.id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send 7-day trip reminder for booking ${booking.id}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('7-day trip reminder job failed', error);
    }
  }

  /**
   * Send trip reminders - 1 day before departure
   */
  async sendTripReminders1DayBefore() {
    this.logger.log('Running 1-day trip reminder job');
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tomorrowPlus1 = new Date(Date.now() + 25 * 60 * 60 * 1000);

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          session: {
            startDate: {
              gte: tomorrow,
              lt: tomorrowPlus1,
            },
          },
        },
        include: {
          traveler: true,
          session: {
            include: {
              template: {
                include: {
                  agency: true,
                },
              },
            },
          },
        },
      });

      for (const booking of bookings) {
        try {
          const notificationsSent = getNotificationState(booking.notificationsSent);
          if (!notificationsSent.tripReminder1Day) {
            const tripDetailsUrl = `${process.env.TRAVELER_APP_URL}/trip/${booking.session.template.id}`;
            
            await this.emailService.sendTripReminder(
              booking.traveler.email,
              booking.session.template.title,
              1,
              booking.session.template.agency.companyName,
              tripDetailsUrl,
            );

            await this.prisma.booking.update({
              where: { id: booking.id },
              data: {
                notificationsSent: {
                  ...notificationsSent,
                  tripReminder1Day: new Date().toISOString(),
                },
              },
            });

            await this.createNotificationLog(
              booking.travelerId,
              'TRIP_REMINDER',
              booking.traveler.email,
              `1-day trip reminder sent for booking ${booking.id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send 1-day trip reminder for booking ${booking.id}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('1-day trip reminder job failed', error);
    }
  }

  /**
   * Auto-cancel unpaid bookings after 24 hours
   */
  async autoCancelUnpaidBookings() {
    this.logger.log('Running auto-cancel unpaid bookings job');
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          createdAt: {
            lt: oneDayAgo,
          },
        },
        include: {
          traveler: true,
          session: { include: { template: true } },
        },
      });

      for (const booking of bookings) {
        try {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason: 'AUTO_CANCELLED_UNPAID',
            },
          });

          // Return seats to session
          await this.prisma.tripSession.update({
            where: { id: booking.sessionId },
            data: {
              availableSeats: {
                increment: booking.guestsCount,
              },
            },
          });

          await this.emailService.sendAutoUnpaidCancellationNotice(
            booking.traveler.email,
            booking.session.template.title,
            booking.id,
          );

          await this.createNotificationLog(
            booking.travelerId,
            'CANCELLATION',
            booking.traveler.email,
            `Booking ${booking.id} auto-cancelled due to non-payment`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to auto-cancel booking ${booking.id}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Auto-cancel unpaid bookings job failed', error);
    }
  }

  private async createNotificationLog(
    userId: string,
    type: NotificationType,
    email: string,
    message: string,
  ) {
    await this.prisma.notificationLog.create({
      data: {
        userId,
        notificationType: type,
        recipientEmail: email,
        message,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }
}
