import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@ouiboo/types';
import { DatabaseModule } from '../src/database/database.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { NotificationJobsService } from '../src/notifications/notification-jobs.service';
import { tripTemplateFixture } from './e2e-fixtures';

jest.setTimeout(60_000);

describe('Email notification jobs E2E', () => {
    let app: INestApplication;
    let db: DatabaseService;
    let jobs: NotificationJobsService;

    const emailService = {
        sendPaymentReminder: jest.fn().mockResolvedValue(undefined),
        sendTripReminder: jest.fn().mockResolvedValue(undefined),
        sendAutoUnpaidCancellationNotice: jest.fn().mockResolvedValue(undefined),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DatabaseModule],
            providers: [
                NotificationJobsService,
                { provide: EmailService, useValue: emailService },
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
        db = app.get(DatabaseService);
        jobs = app.get(NotificationJobsService);
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        emailService.sendPaymentReminder.mockResolvedValue(undefined);
        emailService.sendTripReminder.mockResolvedValue(undefined);
        emailService.sendAutoUnpaidCancellationNotice.mockResolvedValue(undefined);
        await clearDatabase();
    });

    afterAll(async () => {
        if (db) await clearDatabase();
        if (app) await app.close();
    });

    async function clearDatabase() {
        await db.notificationLog.deleteMany({ where: { userId: { startsWith: 'email-' } } });
        await db.booking.deleteMany({ where: { travelerId: { startsWith: 'email-' } } });
        await db.tripSession.deleteMany({ where: { template: { agencyId: 'email-agency-profile' } } });
        await db.tripTemplate.deleteMany({ where: { agencyId: 'email-agency-profile' } });
        await db.notificationPreference.deleteMany({ where: { userId: { startsWith: 'email-' } } });
        await db.agencyProfile.deleteMany({ where: { id: 'email-agency-profile' } });
        await db.user.deleteMany({ where: { id: { startsWith: 'email-' } } });
    }

    async function seedBase() {
        const agencyUser = await db.user.create({
            data: {
                id: 'email-agency-user',
                email: 'agency-email@ouiboo.test',
                name: 'Email Agency',
                password: 'test',
                role: UserRole.Agency,
                isEmailVerified: true,
            },
        });
        const agency = await db.agencyProfile.create({
            data: {
                id: 'email-agency-profile',
                userId: agencyUser.id,
                companyName: 'Email Agency',
                ice: 'EMAIL-ICE-0001',
                patente: 'EMAIL-PATENTE-0001',
                rib: 'EMAIL-RIB-000000000001',
            },
        });
        const traveler = await db.user.create({
            data: {
                id: 'email-traveler-user',
                email: 'traveler-email@ouiboo.test',
                name: 'Email Traveler',
                password: 'test',
                role: UserRole.Traveler,
                isEmailVerified: true,
            },
        });
        const trip = await db.tripTemplate.create({
            data: tripTemplateFixture({
                id: 'email-trip',
                agencyId: agency.id,
                title: 'Atlas Discovery',
            }),
        });
        return { agency, traveler, trip };
    }

    async function createBooking({
        id,
        travelerId,
        tripId,
        status,
        paymentStatus = 'UNPAID',
        startDate = new Date(Date.now() + 3 * 86_400_000),
        endDate = new Date(Date.now() + 4 * 86_400_000),
        createdAt = new Date(),
        availableSeats = 4,
    }: {
        id: string;
        travelerId: string;
        tripId: string;
        status: 'PENDING' | 'AWAITING_VALIDATION' | 'CONFIRMED';
        paymentStatus?: 'UNPAID' | 'PAID';
        startDate?: Date;
        endDate?: Date;
        createdAt?: Date;
        availableSeats?: number;
    }) {
        const session = await db.tripSession.create({
            data: {
                id: `${id}-session`,
                templateId: tripId,
                startDate,
                endDate,
                price: 250,
                totalSeats: 5,
                availableSeats,
            },
        });
        return db.booking.create({
            data: {
                id,
                sessionId: session.id,
                travelerId,
                guestsCount: 1,
                totalAmount: 250,
                status,
                paymentStatus,
                createdAt,
            },
        });
    }

    it('sends one payment reminder, records it, and does not send it twice', async () => {
        const { traveler, trip } = await seedBase();
        const booking = await createBooking({
            id: 'email-payment-reminder',
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'AWAITING_VALIDATION',
            createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
        });

        await jobs.sendPaymentProofReminders();
        await jobs.sendPaymentProofReminders();

        expect(emailService.sendPaymentReminder).toHaveBeenCalledTimes(1);
        expect(emailService.sendPaymentReminder).toHaveBeenCalledWith(
            traveler.email,
            trip.title,
            12,
            expect.stringContaining(`/bookings/${booking.id}`),
        );
        const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
        expect(updated.lastReminderSentAt).toBeTruthy();
        expect((updated.notificationsSent as Record<string, string>).paymentReminder).toBeTruthy();
        expect(await db.notificationLog.count({ where: { userId: traveler.id, notificationType: 'PAYMENT_REMINDER' } })).toBe(1);
    });

    it('honors a traveler opt-out for payment reminders', async () => {
        const { traveler, trip } = await seedBase();
        await db.notificationPreference.create({
            data: { userId: traveler.id, paymentReminder: false },
        });
        const booking = await createBooking({
            id: 'email-payment-opt-out',
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'AWAITING_VALIDATION',
            createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
        });

        await jobs.sendPaymentProofReminders();

        expect(emailService.sendPaymentReminder).not.toHaveBeenCalled();
        expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).lastReminderSentAt).toBeNull();
    });

    it('continues a reminder batch after one email fails and leaves the failure retryable', async () => {
        const { traveler, trip } = await seedBase();
        await createBooking({
            id: 'email-batch-first',
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'AWAITING_VALIDATION',
            createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
        });
        await createBooking({
            id: 'email-batch-second',
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'AWAITING_VALIDATION',
            createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
        });
        emailService.sendPaymentReminder
            .mockRejectedValueOnce(new Error('temporary SMTP failure'))
            .mockResolvedValueOnce(undefined);

        await jobs.sendPaymentProofReminders();

        expect(emailService.sendPaymentReminder).toHaveBeenCalledTimes(2);
        const bookings = await db.booking.findMany({
            where: { id: { in: ['email-batch-first', 'email-batch-second'] } },
        });
        expect(bookings.filter((booking) => booking.lastReminderSentAt)).toHaveLength(1);
        expect(await db.notificationLog.count({ where: { userId: traveler.id } })).toBe(1);
    });

    it.each([
        { days: 7, marker: 'tripReminder7Days' },
        { days: 1, marker: 'tripReminder1Day' },
    ])('sends the $days-day trip reminder once', async ({ days, marker }) => {
        const { traveler, trip } = await seedBase();
        const startDate = new Date(Date.now() + days * 86_400_000 + 10 * 60 * 1000);
        const booking = await createBooking({
            id: `email-trip-${days}`,
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            startDate,
            endDate: new Date(startDate.getTime() + 86_400_000),
        });

        const run = days === 7
            ? () => jobs.sendTripReminders7DaysBefore()
            : () => jobs.sendTripReminders1DayBefore();
        await run();
        await run();

        expect(emailService.sendTripReminder).toHaveBeenCalledTimes(1);
        expect(emailService.sendTripReminder).toHaveBeenCalledWith(
            traveler.email,
            trip.title,
            days,
            'Email Agency',
            expect.stringContaining(`/trip/${trip.id}`),
        );
        const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
        expect((updated.notificationsSent as Record<string, string>)[marker]).toBeTruthy();
    });

    it('atomically cancels an expired unpaid booking and restores its seat', async () => {
        const { traveler, trip } = await seedBase();
        const booking = await createBooking({
            id: 'email-auto-cancel',
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'PENDING',
            createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        });

        await jobs.autoCancelUnpaidBookings();
        await jobs.autoCancelUnpaidBookings();

        const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
        const session = await db.tripSession.findUniqueOrThrow({ where: { id: booking.sessionId } });
        expect(updated.status).toBe('CANCELLED');
        expect(updated.cancellationReason).toBe('AUTO_CANCELLED_UNPAID');
        expect(session.availableSeats).toBe(5);
        expect(emailService.sendAutoUnpaidCancellationNotice).toHaveBeenCalledTimes(1);
        expect(await db.notificationLog.count({ where: { userId: traveler.id, notificationType: 'CANCELLATION' } })).toBe(1);
    });

    it('does not cancel an expired booking that is already paid', async () => {
        const { traveler, trip } = await seedBase();
        const booking = await createBooking({
            id: 'email-paid-booking',
            travelerId: traveler.id,
            tripId: trip.id,
            status: 'PENDING',
            paymentStatus: 'PAID',
            createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        });

        await jobs.autoCancelUnpaidBookings();

        expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('PENDING');
        expect(emailService.sendAutoUnpaidCancellationNotice).not.toHaveBeenCalled();
    });
});
