import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import { UsersModule } from '../src/users/users.module';
import { ReviewsModule } from '../src/reviews/reviews.module';
import { WishlistModule } from '../src/wishlist/wishlist.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { AgencyModule } from '../src/agency/agency.module';
import { TripsModule } from '../src/trips/trips.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { DatabaseModule } from '../src/database/database.module';
import { UploadModule } from '../src/upload/upload.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { UploadService } from '../src/upload/upload.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { TenantGuard } from '../src/auth/guards/tenant.guard';
import { UserRole } from '@ouiboo/types';

jest.setTimeout(60_000);

describe('User features E2E (user-features.e2e-spec)', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const mockEmailService = {
        sendMail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp: string) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name?: string) => `WELCOME:${name}`),
        sendPasswordResetEmail: jest.fn(async () => true),
    } as unknown as EmailService;

    const mockUploadService = {
        uploadFile: jest.fn(async (file: any) => ({ url: 'https://example.com/avatar.png', filename: 'avatar.png', size: file.size || 0 }))
    } as unknown as UploadService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                UsersModule,
                ReviewsModule,
                WishlistModule,
                NotificationsModule,
                AgencyModule,
                TripsModule,
                BookingsModule,
                DatabaseModule,
                UploadModule,
            ],
        })
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .overrideProvider(UploadService)
            .useValue(mockUploadService)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const auth = (req.headers.authorization || '') as string;
                    if (auth.includes('traveler')) {
                        req.user = { userId: 'traveler-user-1', email: 'traveler@test.com', role: UserRole.Traveler };
                    } else if (auth.includes('agency')) {
                        req.user = { userId: 'agency-user-1', email: 'agency@test.com', role: UserRole.Agency };
                    } else if (auth.includes('admin')) {
                        req.user = { userId: 'admin-user', email: 'admin@test.com', role: UserRole.Admin };
                    }
                    return !!req.user;
                }
            })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(TenantGuard)
            .useValue({ canActivate: (context: any) => { const req = context.switchToHttp().getRequest(); req.tenantId = req.headers['x-tenant-id'] || 'agency-profile-1'; return true; } })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        db = app.get(DatabaseService);
    });

    afterAll(async () => {
        await clearDatabase();
        await app.close();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await clearDatabase();
    });

    async function clearDatabase() {
        if (!db) return;
        await db.review.deleteMany();
        await db.wishlist.deleteMany();
        await db.paymentProof.deleteMany();
        await db.booking.deleteMany();
        await db.tripSession.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.notificationPreference.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.user.deleteMany();
    }

    async function seedTestData() {
        // traveler
        const traveler = await db.user.create({ data: { id: 'traveler-user-1', email: 'traveler@test.com', name: 'Traveler', password: 'x', role: UserRole.Traveler, isEmailVerified: true } as any });
        // agency user
        const agencyUser = await db.user.create({ data: { id: 'agency-user-1', email: 'agency@test.com', name: 'Agency', password: 'x', role: UserRole.Agency, isEmailVerified: true } as any });
        const agencyProfile = await db.agencyProfile.create({ data: { id: 'agency-profile-1', userId: agencyUser.id, companyName: 'Agency Ltd' } as any });

        // admin
        const adminUser = await db.user.create({ data: { id: 'admin-user', email: 'admin@test.com', name: 'Admin', password: 'x', role: UserRole.Admin, isEmailVerified: true } as any });

        return { traveler, agencyUser, agencyProfile, adminUser };
    }

    // ===== User profile tests =====
    it('Update user profile (name, displayCurrency)', async () => {
        const { traveler } = await seedTestData();

        const res = await request(app.getHttpServer())
            .patch('/users/profile')
            .set('Authorization', 'Bearer traveler')
            .send({ name: 'Updated Name', displayCurrency: 'USD' })
            .expect(200);

        expect(res.body.name).toBe('Updated Name');
        expect(res.body.displayCurrency).toBe('USD');

        const u = await db.user.findUnique({ where: { id: traveler.id } });
        expect(u?.name).toBe('Updated Name');
        expect(u?.displayCurrency).toBe('USD');

        // attempt to update another user
        const other = await db.user.create({ data: { id: 'traveler-2', email: 't2@test.com', name: 'T2', password: 'x', role: UserRole.Traveler } as any });
        await request(app.getHttpServer())
            .patch('/users/profile')
            .set('Authorization', 'Bearer traveler')
            .send({ id: other.id, name: 'Hacked' })
            .expect(403);
    });

    it('Upload user avatar', async () => {
        await seedTestData();
        const fixture = path.join(__dirname, 'fixtures', 'proof.png');

        const res = await request(app.getHttpServer())
            .post('/users/avatar')
            .set('Authorization', 'Bearer traveler')
            .attach('file', fixture)
            .expect(201);

        expect(res.body.url).toBeDefined();

        const u = await db.user.findUnique({ where: { id: 'traveler-user-1' } });
        expect(u?.avatar).toBe(res.body.url);

        // unauthorized
        await request(app.getHttpServer()).post('/users/avatar').attach('file', fixture).expect(401);
    });

    it('Get current user profile', async () => {
        const { traveler } = await seedTestData();
        await db.user.update({ where: { id: traveler.id }, data: { avatar: 'https://example.com/a.png', displayCurrency: 'EUR' } });

        const res = await request(app.getHttpServer())
            .get('/users/me')
            .set('Authorization', 'Bearer traveler')
            .expect(200);

        expect(res.body.id).toBe(traveler.id);
        expect(res.body.avatar).toBe('https://example.com/a.png');
        expect(res.body.displayCurrency).toBe('EUR');
        expect(res.body).not.toHaveProperty('password');
    });

    // ===== Review CRUD tests =====
    it('Create review for completed booking', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Test Trip', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 10, availableSeats: 10 } as any });
        const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } as any });

        const res = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/review`)
            .set('Authorization', 'Bearer traveler')
            .send({ rating: 5, comment: 'Excellent trip!' })
            .expect(201);

        expect(res.body.rating).toBe(5);
        const review = await db.review.findUnique({ where: { id: res.body.id } });
        expect(review).toBeTruthy();
        expect(review?.isVerifiedBooking).toBe(true);
    });

    it('Prevent review creation for non-completed bookings', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Test Trip 2', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 10, availableSeats: 10 } as any });
        const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'PENDING' } as any });

        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/review`)
            .set('Authorization', 'Bearer traveler')
            .send({ rating: 5, comment: 'Too early' })
            .expect(400);

        const reviews = await db.review.findMany({ where: { bookingId: booking.id } });
        expect(reviews.length).toBe(0);
    });

    it('Prevent duplicate reviews', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip X', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 10, availableSeats: 10 } as any });
        const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } as any });

        await db.review.create({ data: { bookingId: booking.id, tripTemplateId: template.id, travelerId: traveler.id, rating: 5, comment: 'Nice' } as any });

        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/review`)
            .set('Authorization', 'Bearer traveler')
            .send({ rating: 4, comment: 'Second' })
            .expect(400);
    });

    it('Update review by author', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip Update', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 10, availableSeats: 10 } as any });
        const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } as any });
        const review = await db.review.create({ data: { bookingId: booking.id, tripTemplateId: template.id, travelerId: traveler.id, rating: 4, comment: 'Good' } as any });

        await request(app.getHttpServer())
            .patch(`/reviews/${review.id}`)
            .set('Authorization', 'Bearer traveler')
            .send({ rating: 5, comment: 'Updated comment' })
            .expect(200);

        const updated = await db.review.findUnique({ where: { id: review.id } });
        expect(updated?.rating).toBe(5);
    });

    it('Delete review', async () => {
        const { traveler, agencyProfile, adminUser } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip Delete', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 10, availableSeats: 10 } as any });
        const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } as any });
        const review = await db.review.create({ data: { bookingId: booking.id, tripTemplateId: template.id, travelerId: traveler.id, rating: 4, comment: 'ToDelete' } as any });

        // Author deletes
        await request(app.getHttpServer()).delete(`/reviews/${review.id}`).set('Authorization', 'Bearer traveler').expect(200);
        await request(app.getHttpServer()).get(`/reviews/${review.id}`).set('Authorization', 'Bearer traveler').expect(404);

        // admin can delete others
        const rev2 = await db.review.create({ data: { bookingId: booking.id, tripTemplateId: template.id, travelerId: traveler.id, rating: 3, comment: 'Another' } as any });
        await request(app.getHttpServer()).delete(`/reviews/${rev2.id}`).set('Authorization', 'Bearer admin').expect(200);
    });

    it('Agency responds to review', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip Resp', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 10, availableSeats: 10 } as any });
        const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } as any });
        const review = await db.review.create({ data: { bookingId: booking.id, tripTemplateId: template.id, travelerId: traveler.id, rating: 4, comment: 'Nice' } as any });

        await request(app.getHttpServer()).post(`/reviews/${review.id}/response`).set('Authorization', 'Bearer agency').send({ response: 'Thank you!' }).expect(201);

        const updated = await db.review.findUnique({ where: { id: review.id } });
        expect(updated?.response).toBe('Thank you!');

        // different agency cannot respond
        await request(app.getHttpServer()).post(`/reviews/${review.id}/response`).set('Authorization', 'Bearer traveler').send({ response: 'Oops' }).expect(403);
    });

    it('Get reviews for trip with pagination', async () => {
        const { agencyProfile, traveler } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip Pag', status: 'ACTIVE' } as any });

        for (let i = 0; i < 15; i++) {
            await db.review.create({ data: { tripTemplateId: template.id, travelerId: traveler.id, rating: 5, comment: `c${i}` } as any });
        }

        const res1 = await request(app.getHttpServer()).get(`/trips/${template.id}/reviews?page=1&limit=10`).expect(200);
        expect(res1.body.data.length).toBe(10);
        expect(res1.body.pagination.total).toBe(15);

        const res2 = await request(app.getHttpServer()).get(`/trips/${template.id}/reviews?page=2&limit=10`).expect(200);
        expect(res2.body.data.length).toBe(5);
    });

    it('Get review statistics', async () => {
        const { agencyProfile, traveler } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Stats Trip', status: 'ACTIVE' } as any });

        const ratings = [5, 5, 4, 3, 5];
        for (const r of ratings) {
            await db.review.create({ data: { tripTemplateId: template.id, travelerId: traveler.id, rating: r, comment: 'x' } as any });
        }

        const res = await request(app.getHttpServer()).get(`/trips/${template.id}/reviews/stats`).expect(200);
        expect(res.body.averageRating).toBeCloseTo(4.4, 1);
        expect(res.body.totalReviews).toBe(5);
        expect(res.body.distribution['5']).toBe(3);
    });

    // ===== Wishlist tests =====
    it('Add trip to wishlist and prevent duplicates', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Wish Trip', status: 'ACTIVE' } as any });

        await request(app.getHttpServer()).post(`/users/wishlist/${template.id}`).set('Authorization', 'Bearer traveler').expect(201);
        await request(app.getHttpServer()).post(`/users/wishlist/${template.id}`).set('Authorization', 'Bearer traveler').expect(400);
    });

    it('Remove trip from wishlist', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Wish Trip 2', status: 'ACTIVE' } as any });

        await request(app.getHttpServer()).post(`/users/wishlist/${template.id}`).set('Authorization', 'Bearer traveler').expect(201);
        await request(app.getHttpServer()).delete(`/users/wishlist/${template.id}`).set('Authorization', 'Bearer traveler').expect(204);
        await request(app.getHttpServer()).get(`/users/wishlist/${template.id}/is-wishlisted`).set('Authorization', 'Bearer traveler').expect(200).expect({ isWishlisted: false });
    });

    it('Get user wishlist with pagination and count', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        for (let i = 0; i < 25; i++) {
            const t = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: `T${i}`, status: 'ACTIVE' } as any });
            await db.wishlist.create({ data: { userId: traveler.id, tripTemplateId: t.id } as any });
        }

        const res = await request(app.getHttpServer()).get('/users/wishlist?page=1&limit=20').set('Authorization', 'Bearer traveler').expect(200);
        expect(res.body.data.length).toBe(20);

        const countRes = await request(app.getHttpServer()).get('/users/wishlist/count').set('Authorization', 'Bearer traveler').expect(200);
        expect(countRes.body.count).toBe(25);
    });

    // ===== Notification preferences tests =====
    it('Get default notification preferences and update', async () => {
        const { traveler } = await seedTestData();
        const getRes = await request(app.getHttpServer()).get('/users/notifications/preferences').set('Authorization', 'Bearer traveler').expect(200);
        expect(getRes.body.emailNotifications).toBe(true);

        await request(app.getHttpServer()).patch('/users/notifications/preferences').set('Authorization', 'Bearer traveler').send({ emailNotifications: false, smsNotifications: true }).expect(200);
        const updated = await db.notificationPreference.findUnique({ where: { userId: traveler.id } });
        expect(updated?.emailNotifications).toBe(false);
        expect(updated?.smsNotifications).toBe(true);
    });

    it('Preferences are user-specific', async () => {
        const { traveler } = await seedTestData();
        const other = await db.user.create({ data: { id: 'trav-2', email: 't2@test.com', name: 'T2', password: 'x', role: UserRole.Traveler } as any });

        await request(app.getHttpServer()).patch('/users/notifications/preferences').set('Authorization', 'Bearer traveler').send({ smsNotifications: true }).expect(200);
        const prefOther = await db.notificationPreference.findUnique({ where: { userId: other.id } });
        expect(prefOther?.smsNotifications).toBe(false);
    });

    // ===== Agency profile tests =====
    it('Update agency profile (company info and bank details) and verification read-only', async () => {
        const { agencyUser, agencyProfile } = await seedTestData();
        const res = await request(app.getHttpServer()).patch('/agency/profile').set('Authorization', 'Bearer agency').send({ companyName: 'New Name', bio: 'Updated bio', logo: 'https://example.com/logo.png', bankDetails: 'IBAN: MA123' }).expect(200);
        const updated = await db.agencyProfile.findUnique({ where: { id: agencyProfile.id } });
        expect(updated?.companyName).toBe('New Name');
        expect(updated?.rib || updated?.bankDetails || '').toBeDefined();

        // attempt to change verificationStatus
        await request(app.getHttpServer()).patch('/agency/profile').set('Authorization', 'Bearer agency').send({ verificationStatus: 'VERIFIED' }).expect(200);
        const after = await db.agencyProfile.findUnique({ where: { id: agencyProfile.id } });
        expect(after?.verificationStatus).not.toBe('VERIFIED');
    });

    it('Tenant isolation for agency updates', async () => {
        const { agencyProfile } = await seedTestData();
        // try to update another agency
        const other = await db.user.create({ data: { id: 'agency-2', email: 'a2@test.com', name: 'A2', password: 'x', role: UserRole.Agency } as any });
        const otherProfile = await db.agencyProfile.create({ data: { id: 'agency-profile-2', userId: other.id, companyName: 'Other' } as any });

        await request(app.getHttpServer()).patch('/agency/profile').set('Authorization', 'Bearer agency-12345').send({ companyName: 'ShouldFail' }).expect(403);
    });

    // ===== Authorization & validation tests =====
    it('Unauthenticated requests are rejected', async () => {
        await request(app.getHttpServer()).get('/users/me').expect(401);
        await request(app.getHttpServer()).post('/users/wishlist/non-existent').expect(401);
    });

    it('Users can only update their own data', async () => {
        const { traveler } = await seedTestData();
        const other = await db.user.create({ data: { id: 'trav-3', email: 't3@test.com', name: 'T3', password: 'x', role: UserRole.Traveler } as any });
        await request(app.getHttpServer()).patch('/users/profile').set('Authorization', 'Bearer traveler').send({ id: other.id, name: 'Hacker' }).expect(403);
    });

    it('Invalid data validation', async () => {
        await seedTestData();
        await request(app.getHttpServer()).patch('/users/profile').set('Authorization', 'Bearer traveler').send({ displayCurrency: 'INVALID' }).expect(400);
        await request(app.getHttpServer()).post('/bookings/non-existent/review').set('Authorization', 'Bearer traveler').send({ rating: 6, comment: 'x' }).expect(400);
    });

    // ===== Integration: complete user journey (smoke) =====
    it('Complete user journey: register -> profile -> avatar -> wishlist -> book -> review', async () => {
        const { traveler, agencyProfile } = await seedTestData();
        const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Journey Trip', status: 'ACTIVE' } as any });
        const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } as any });

        // update profile
        await request(app.getHttpServer()).patch('/users/profile').set('Authorization', 'Bearer traveler').send({ name: 'Journeyer' }).expect(200);
        // avatar
        const fixture = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer()).post('/users/avatar').set('Authorization', 'Bearer traveler').attach('file', fixture).expect(201);
        // wishlist
        await request(app.getHttpServer()).post(`/users/wishlist/${template.id}`).set('Authorization', 'Bearer traveler').expect(201);
        // create booking
        const bookingRes = await request(app.getHttpServer()).post('/bookings').set('Authorization', 'Bearer traveler').send({ sessionId: session.id, guestsCount: 1, fullName: 'J', phoneNumber: '+1', documentNumber: 'ID', paymentMethod: 'BANK_TRANSFER' }).expect(201);
        // mark as completed directly in DB for review
        await db.booking.update({ where: { id: bookingRes.body.id }, data: { status: 'COMPLETED' } });
        // review
        await request(app.getHttpServer()).post(`/bookings/${bookingRes.body.id}/review`).set('Authorization', 'Bearer traveler').send({ rating: 5, comment: 'Great' }).expect(201);
    });
});
