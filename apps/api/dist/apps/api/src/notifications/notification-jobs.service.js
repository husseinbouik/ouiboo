"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationJobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const database_service_1 = require("../database/database.service");
const email_service_1 = require("../email/email.service");
let NotificationJobsService = NotificationJobsService_1 = class NotificationJobsService {
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.logger = new common_1.Logger(NotificationJobsService_1.name);
    }
    async sendPaymentProofReminders() {
        this.logger.log('Running payment proof reminder job');
        try {
            const twoHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const bookings = await this.prisma.booking.findMany({
                where: {
                    status: 'AWAITING_VALIDATION',
                    paymentStatus: 'UNPAID',
                    createdAt: {
                        lt: twoHoursAgo,
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
                    await this.emailService.sendPaymentReminder(booking.traveler.email, booking.session.template.title, hoursRemaining, bookingDashboardUrl);
                    await this.prisma.booking.update({
                        where: { id: booking.id },
                        data: {
                            lastReminderSentAt: new Date(),
                            notificationsSent: {
                                ...(booking.notificationsSent || {}),
                                paymentReminder: new Date().toISOString(),
                            },
                        },
                    });
                    await this.createNotificationLog(booking.travelerId, 'PAYMENT_REMINDER', booking.traveler.email);
                }
                catch (error) {
                    this.logger.error(`Failed to send payment reminder for booking ${booking.id}`, error);
                }
            }
        }
        catch (error) {
            this.logger.error('Payment proof reminder job failed', error);
        }
    }
    async sendTripReminders7DaysBefore() {
        this.logger.log('Running 7-day trip reminder job');
        try {
            const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const sevenDaysPlus1 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
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
                    session: { include: { template: true, agency: true } },
                },
            });
            for (const booking of bookings) {
                try {
                    const notificationsSent = booking.notificationsSent || {};
                    if (!notificationsSent.tripReminder7Days) {
                        const tripDetailsUrl = `${process.env.TRAVELER_APP_URL}/trips/${booking.session.template.id}`;
                        await this.emailService.sendTripReminder(booking.traveler.email, booking.session.template.title, 7, booking.session.agency.name, tripDetailsUrl);
                        await this.prisma.booking.update({
                            where: { id: booking.id },
                            data: {
                                notificationsSent: {
                                    ...notificationsSent,
                                    tripReminder7Days: new Date().toISOString(),
                                },
                            },
                        });
                        await this.createNotificationLog(booking.travelerId, 'TRIP_REMINDER', booking.traveler.email);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to send 7-day trip reminder for booking ${booking.id}`, error);
                }
            }
        }
        catch (error) {
            this.logger.error('7-day trip reminder job failed', error);
        }
    }
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
                    session: { include: { template: true, agency: true } },
                },
            });
            for (const booking of bookings) {
                try {
                    const notificationsSent = booking.notificationsSent || {};
                    if (!notificationsSent.tripReminder1Day) {
                        const tripDetailsUrl = `${process.env.TRAVELER_APP_URL}/trips/${booking.session.template.id}`;
                        await this.emailService.sendTripReminder(booking.traveler.email, booking.session.template.title, 1, booking.session.agency.name, tripDetailsUrl);
                        await this.prisma.booking.update({
                            where: { id: booking.id },
                            data: {
                                notificationsSent: {
                                    ...notificationsSent,
                                    tripReminder1Day: new Date().toISOString(),
                                },
                            },
                        });
                        await this.createNotificationLog(booking.travelerId, 'TRIP_REMINDER', booking.traveler.email);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to send 1-day trip reminder for booking ${booking.id}`, error);
                }
            }
        }
        catch (error) {
            this.logger.error('1-day trip reminder job failed', error);
        }
    }
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
                    await this.prisma.tripSession.update({
                        where: { id: booking.sessionId },
                        data: {
                            availableSeats: {
                                increment: booking.guestsCount,
                            },
                        },
                    });
                    await this.emailService.sendAutoUnpaidCancellationNotice(booking.traveler.email, booking.session.template.title, booking.id);
                    await this.createNotificationLog(booking.travelerId, 'CANCELLATION', booking.traveler.email);
                }
                catch (error) {
                    this.logger.error(`Failed to auto-cancel booking ${booking.id}`, error);
                }
            }
        }
        catch (error) {
            this.logger.error('Auto-cancel unpaid bookings job failed', error);
        }
    }
    async createNotificationLog(userId, type, email) {
        await this.prisma.notificationLog.create({
            data: {
                userId,
                notificationType: type,
                recipientEmail: email,
                status: 'SENT',
                sentAt: new Date(),
            },
        });
    }
};
exports.NotificationJobsService = NotificationJobsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationJobsService.prototype, "sendPaymentProofReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationJobsService.prototype, "sendTripReminders7DaysBefore", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationJobsService.prototype, "sendTripReminders1DayBefore", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationJobsService.prototype, "autoCancelUnpaidBookings", null);
exports.NotificationJobsService = NotificationJobsService = NotificationJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        email_service_1.EmailService])
], NotificationJobsService);
//# sourceMappingURL=notification-jobs.service.js.map