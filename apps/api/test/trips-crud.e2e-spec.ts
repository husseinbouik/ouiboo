import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import { TripsModule } from '../src/trips/trips.module';
import { DatabaseModule } from '../src/database/database.module';
import { EmailModule } from '../src/email/email.module';
import { UploadModule } from '../src/upload/upload.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { TenantGuard } from '../src/auth/guards/tenant.guard';
import { UserRole } from '@ouiboo/types';
import { AgencyModule } from '../src/agency/agency.module';

jest.setTimeout(60_000);

describe('Trips CRUD E2E (trips-crud.e2e-spec)', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const mockEmailService = {
        sendMail: jest.fn(async () => true),
        sendBookingNotification: jest.fn(async () => true),
        sendPaymentConfirmation: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp: string) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name?: string) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url: string) => `RESET:${url}`),
        sendPasswordResetEmail: jest.fn(async () => true),
    } as unknown as EmailService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [TripsModule, AgencyModule, DatabaseModule, EmailModule, UploadModule],
        })
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const authHeader = req.headers.authorization || '';

                    if (authHeader.includes('agency-123')) {
                        req.user = { userId: 'agency-user-123', email: 'agency@test.com', role: UserRole.Agency };
                    } else if (authHeader.includes('agency-456')) {
                        req.user = { userId: 'agency-user-456', email: 'agency2@test.com', role: UserRole.Agency };
                    } else if (authHeader.includes('traveler')) {
                        req.user = { userId: 'traveler-user-123', email: 'traveler@test.com', role: UserRole.Traveler };
                    } else if (authHeader.includes('admin')) {
                        req.user = { userId: 'admin-user', email: 'admin@test.com', role: UserRole.Admin };
                    }
                    return !!req.user;
                },
            })
            .overrideGuard(RolesGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    return req.user?.role === UserRole.Agency || req.user?.role === UserRole.Admin;
                },
            })
            .overrideGuard(TenantGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const authHeader = req.headers.authorization || '';

                    if (authHeader.includes('agency-123')) {
                        req.tenantId = 'agency-profile-123';
                    } else if (authHeader.includes('agency-456')) {
                        req.tenantId = 'agency-profile-456';
                    }
                    return true;
                },
            })
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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
        await db.booking.deleteMany();
        await db.paymentProof.deleteMany();
        await db.tripSession.deleteMany();
        await db.itineraryDay.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.wallet.deleteMany();
        await db.user.deleteMany();
    }

    async function seedTestData() {
        // Create agency user 1
        const agencyUser1 = await db.user.create({
            data: {
                id: 'agency-user-123',
                email: 'agency@test.com',
                name: 'Test Agency',
                password: 'hashed-password',
                role: UserRole.Agency,
                isEmailVerified: true,
            } as any,
        });

        // Create agency profile 1
        const agency1 = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-123',
                userId: agencyUser1.id,
                companyName: 'Test Agency', ice: 'ICE100004', patente: 'PAT100004', rib: 'RIB100004', verificationStatus: 'VERIFIED', travelLicenceStatus: 'VERIFIED', travelLicenceNumber: 'LIC-100004', licenceExpiry: new Date('2030-01-01T00:00:00.000Z'), licenceIssuedAt: new Date('2024-01-15T00:00:00.000Z'), licenceIssuingAuthority: 'Ministère du Tourisme', travelLicenceType: 'ODV', insuranceStatus: 'VERIFIED', insuranceExpiry: new Date('2030-01-01T00:00:00.000Z'),
            } as any,
        });

        // Create agency user 2
        const agencyUser2 = await db.user.create({
            data: {
                id: 'agency-user-456',
                email: 'agency2@test.com',
                name: 'Other Agency',
                password: 'hashed-password',
                role: UserRole.Agency,
                isEmailVerified: true,
            } as any,
        });

        // Create agency profile 2
        const agency2 = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-456',
                userId: agencyUser2.id,
                companyName: 'Other Agency', ice: 'ICE100005', patente: 'PAT100005', rib: 'RIB100005', verificationStatus: 'VERIFIED', travelLicenceStatus: 'VERIFIED', travelLicenceNumber: 'LIC-100005', licenceExpiry: new Date('2030-01-01T00:00:00.000Z'), licenceIssuedAt: new Date('2024-01-15T00:00:00.000Z'), licenceIssuingAuthority: 'Ministère du Tourisme', travelLicenceType: 'ODV', insuranceStatus: 'VERIFIED', insuranceExpiry: new Date('2030-01-01T00:00:00.000Z'),
            } as any,
        });

        // Create traveler user
        const traveler = await db.user.create({
            data: {
                id: 'traveler-user-123',
                email: 'traveler@test.com',
                name: 'Test Traveler',
                password: 'hashed-password',
                role: UserRole.Traveler,
                isEmailVerified: true,
            } as any,
        });

        return { agencyUser1, agency1, agencyUser2, agency2, traveler };
    }

    async function createTripTemplate(agencyId: string, overrides?: any) {
        const defaultData = {
            agencyId,
            title: 'Default Trip',
            description: 'A test trip',
            category: 'ADVENTURE',
            startLocation: 'Location A',
            endLocation: 'Location B',
            durationDays: 5,
            durationNights: 4,
            inclusions: ['Transport', 'Guide'],
            exclusions: ['Flights'],
            checklist: ['Passport'],
            images: [],
            status: 'DRAFT',
        };

        return db.tripTemplate.create({
            data: { ...defaultData, ...overrides } as any,
        });
    }

    async function createTripSession(templateId: string, overrides?: any) {
        const defaultData = {
            templateId,
            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
            price: 1200,
            deposit: 300,
            totalSeats: 20,
            availableSeats: 20,
            status: 'OPEN',
        };

        const session = await db.tripSession.create({
            data: { ...defaultData, ...overrides } as any,
        });
        const minimum = await db.tripSession.aggregate({
            where: { templateId, status: 'OPEN' },
            _min: { price: true },
        });
        await db.tripTemplate.update({
            where: { id: templateId },
            data: { startingPrice: minimum._min.price },
        });
        return session;
    }

    // ===== Section 3: Trip Template Creation Tests =====
    it('Agency creates trip template with itinerary', async () => {
        const { agency1 } = await seedTestData();

        const res = await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer agency-123')
            .send({
                title: 'Desert Adventure',
                description: 'Experience the Sahara desert',
                category: 'ADVENTURE',
                startLocation: 'Marrakech',
                endLocation: 'Timbuktu',
                durationDays: 5,
                durationNights: 4,
                inclusions: ['Transport', 'Meals', 'Guide'],
                exclusions: ['Flights', 'Insurance'],
                checklist: ['Sunscreen', 'Hat'],
                images: ['https://example.com/image1.jpg'],
                status: 'DRAFT',
                itinerary: [
                    { dayNumber: 1, title: 'Day 1', description: 'Travel to Marrakech', activities: ['Explore medina'] },
                    { dayNumber: 2, title: 'Day 2', description: 'Desert journey', activities: ['Camel trek'] },
                    { dayNumber: 3, title: 'Day 3', description: 'Sahara camping', activities: ['Stargazing'] },
                    { dayNumber: 4, title: 'Day 4', description: 'Return journey', activities: ['Visit market'] },
                    { dayNumber: 5, title: 'Day 5', description: 'Rest day', activities: ['Shopping'] },
                ],
            })
            .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.agencyId).toBe(agency1.id);
        expect(res.body.status).toBe('DRAFT');
        expect(res.body.itinerary).toHaveLength(5);

        const template = await db.tripTemplate.findUnique({
            where: { id: res.body.id },
            include: { itinerary: true },
        });
        expect(template).toBeTruthy();
        expect(template?.agencyId).toBe(agency1.id);
        expect(template?.itinerary).toHaveLength(5);
    });

    it('Agency creates trip template without itinerary', async () => {
        await seedTestData();

        const res = await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer agency-123')
            .send({
                title: 'Quick Trip',
                description: 'A short trip',
                category: 'CULTURAL',
                startLocation: 'Fes',
                endLocation: 'Meknes',
                durationDays: 2,
                durationNights: 1,
                inclusions: ['Guide'],
                exclusions: [],
                checklist: [],
                images: [],
                status: 'DRAFT',
            })
            .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.itinerary?.length || 0).toBe(0);

        const template = await db.tripTemplate.findUnique({
            where: { id: res.body.id },
            include: { itinerary: true },
        });
        expect(template?.itinerary).toHaveLength(0);
    });

    it('Validation fails for invalid trip data', async () => {
        await seedTestData();

        // Missing required fields
        await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer agency-123')
            .send({
                description: 'Missing title',
                category: 'ADVENTURE',
            })
            .expect(400);

        // Invalid category
        await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer agency-123')
            .send({
                title: 'Test',
                description: 'Test',
                category: 'INVALID_CATEGORY',
                startLocation: 'A',
                endLocation: 'B',
                durationDays: 5,
                durationNights: 4,
                inclusions: [],
                exclusions: [],
                checklist: [],
                images: [],
                status: 'DRAFT',
            })
            .expect(400);

        // Negative duration
        await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer agency-123')
            .send({
                title: 'Test',
                description: 'Test',
                category: 'ADVENTURE',
                startLocation: 'A',
                endLocation: 'B',
                durationDays: -5,
                durationNights: 4,
                inclusions: [],
                exclusions: [],
                checklist: [],
                images: [],
                status: 'DRAFT',
            })
            .expect(400);
    });

    it('Non-agency user cannot create trip template', async () => {
        await seedTestData();

        await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer traveler')
            .send({
                title: 'Test Trip',
                description: 'Test',
                category: 'ADVENTURE',
                startLocation: 'A',
                endLocation: 'B',
                durationDays: 5,
                durationNights: 4,
                inclusions: [],
                exclusions: [],
                checklist: [],
                images: [],
                status: 'DRAFT',
            })
            .expect(403);
    });

    // ===== Section 4: Trip Template Update Tests =====
    it('Agency updates own trip template', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        const res = await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({
                title: 'Updated Desert Adventure',
                description: 'New description',
                status: 'ACTIVE',
                itinerary: [
                    { dayNumber: 1, title: 'Day 1', description: 'Travel', activities: [] },
                    { dayNumber: 2, title: 'Day 2', description: 'Trek', activities: [] },
                    { dayNumber: 3, title: 'Day 3', description: 'Rest', activities: [] },
                ],
            })
            .expect(200);

        expect(res.body.title).toBe('Updated Desert Adventure');
        expect(res.body.status).toBe('ACTIVE');

        const updated = await db.tripTemplate.findUnique({
            where: { id: template.id },
            include: { itinerary: true },
        });
        expect(updated?.title).toBe('Updated Desert Adventure');
        expect(updated?.itinerary).toHaveLength(3);
    });

    it('Agency cannot update another agency trip template', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-456')
            .send({ title: 'Hacked Title' })
            .expect(404);
    });

    it('Partial update of trip template', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id, { title: 'Original Title' });

        await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ status: 'ACTIVE' })
            .expect(200);

        const updated = await db.tripTemplate.findUnique({ where: { id: template.id } });
        expect(updated?.status).toBe('ACTIVE');
        expect(updated?.title).toBe('Original Title');
    });

    // ===== Section 5: Trip Template Deletion Tests =====
    it('Agency deletes own draft trip template', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        await request(app.getHttpServer())
            .delete(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .expect(200);

        // Drafts are hard-deleted (not archived)
        const deleted = await db.tripTemplate.findUnique({ where: { id: template.id } });
        expect(deleted).toBeNull();
    });

    it('Agency cannot delete another agency trip template', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        await request(app.getHttpServer())
            .delete(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-456')
            .expect(404);
    });

    it('Cannot delete trip template with active bookings', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);
        const session = await createTripSession(template.id);

        await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 2400,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                status: 'CONFIRMED',
            } as any,
        });

        await request(app.getHttpServer())
            .delete(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .expect(409);
    });

    // ===== Section 6: Trip Session Creation Tests =====
    it('Agency creates session for own trip template', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);

        const res = await request(app.getHttpServer())
            .post(`/trips/${template.id}/sessions`)
            .set('Authorization', 'Bearer agency-123')
            .send({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                price: 1200,
                deposit: 300,
                totalSeats: 20,
            })
            .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.availableSeats).toBe(20);
        expect(res.body.status).toBe('OPEN');

        const session = await db.tripSession.findUnique({ where: { id: res.body.id } });
        expect(session).toBeTruthy();
        expect(session?.templateId).toBe(template.id);
    });

    it('Session date validation', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        const startDate = new Date();
        const endDate = new Date(Date.now() - 1000); // Past

        // endDate before startDate
        await request(app.getHttpServer())
            .post(`/trips/${template.id}/sessions`)
            .set('Authorization', 'Bearer agency-123')
            .send({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                price: 1200,
                deposit: 300,
                totalSeats: 20,
            })
            .expect(400);

        // startDate in the past
        await request(app.getHttpServer())
            .post(`/trips/${template.id}/sessions`)
            .set('Authorization', 'Bearer agency-123')
            .send({
                startDate: new Date(Date.now() - 1000).toISOString(),
                endDate: new Date(Date.now() + 1000).toISOString(),
                price: 1200,
                deposit: 300,
                totalSeats: 20,
            })
            .expect(400);
    });

    it('Agency cannot create session for another agency trip', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        await request(app.getHttpServer())
            .post(`/trips/${template.id}/sessions`)
            .set('Authorization', 'Bearer agency-456')
            .send({
                startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                price: 1200,
                deposit: 300,
                totalSeats: 20,
            })
            .expect(404);
    });

    // ===== Section 7: Trip Listing and Filtering Tests =====
    it('Public trip listing with no filters', async () => {
        const { agency1, agency2 } = await seedTestData();

        await createTripTemplate(agency1.id, { status: 'ACTIVE', title: 'Trip 1' });
        await createTripTemplate(agency1.id, { status: 'DRAFT', title: 'Trip 2' });
        await createTripTemplate(agency2.id, { status: 'ACTIVE', title: 'Trip 3' });

        const res = await request(app.getHttpServer())
            .get('/trips')
            .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.data.filter((t: any) => t.status === 'DRAFT')).toHaveLength(0);
    });

    it('Filter trips by price range', async () => {
        const { agency1 } = await seedTestData();

        const t1 = await createTripTemplate(agency1.id, { status: 'ACTIVE' });
        const t2 = await createTripTemplate(agency1.id, { status: 'ACTIVE' });
        const t3 = await createTripTemplate(agency1.id, { status: 'ACTIVE' });

        await createTripSession(t1.id, { price: 500 });
        await createTripSession(t2.id, { price: 1000 });
        await createTripSession(t3.id, { price: 1500 });

        const res = await request(app.getHttpServer())
            .get('/trips?priceMin=800&priceMax=1200')
            .expect(200);

        const prices = res.body.data.flatMap((t: any) => t.sessions?.map((s: any) => s.price) || []);
        expect(prices.every((p: number) => p >= 800 && p <= 1200)).toBe(true);
    });

    it('Filter trips by duration', async () => {
        const { agency1 } = await seedTestData();

        await createTripTemplate(agency1.id, { status: 'ACTIVE', durationDays: 3 });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', durationDays: 5 });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', durationDays: 7 });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', durationDays: 10 });

        const res = await request(app.getHttpServer())
            .get('/trips?durationMin=5&durationMax=7')
            .expect(200);

        expect(res.body.data.every((t: any) => t.durationDays >= 5 && t.durationDays <= 7)).toBe(true);
    });

    it('Filter trips by category', async () => {
        const { agency1 } = await seedTestData();

        await createTripTemplate(agency1.id, { status: 'ACTIVE', category: 'ADVENTURE' });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', category: 'CULTURAL' });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', category: 'LUXURY' });

        const res = await request(app.getHttpServer())
            .get('/trips?category=ADVENTURE')
            .expect(200);

        expect(res.body.data.every((t: any) => t.category === 'ADVENTURE')).toBe(true);
    });

    it('Filter trips by availability', async () => {
        const { agency1 } = await seedTestData();

        const t1 = await createTripTemplate(agency1.id, { status: 'ACTIVE' });
        const t2 = await createTripTemplate(agency1.id, { status: 'ACTIVE' });

        await createTripSession(t1.id, { availableSeats: 5 });
        await createTripSession(t2.id, { availableSeats: 0 });

        const res = await request(app.getHttpServer())
            .get('/trips?available=true')
            .expect(200);

        expect(res.body.data.every((t: any) => (t.sessions?.[0]?.availableSeats || 0) > 0)).toBe(true);
    });

    it('Featured trips filter', async () => {
        const { agency1 } = await seedTestData();

        await createTripTemplate(agency1.id, { status: 'ACTIVE', featured: true });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', featured: false });
        await createTripTemplate(agency1.id, { status: 'ACTIVE', featured: true });

        const res = await request(app.getHttpServer())
            .get('/trips?featured=true')
            .expect(200);

        expect(res.body.data.every((t: any) => t.featured === true)).toBe(true);
        expect(res.body.data.length).toBe(2);
    });

    it('Pagination works correctly', async () => {
        const { agency1 } = await seedTestData();

        for (let i = 0; i < 50; i++) {
            await createTripTemplate(agency1.id, { status: 'ACTIVE', title: `Trip ${i}` });
        }

        const res = await request(app.getHttpServer())
            .get('/trips?page=2&limit=10')
            .expect(200);

        expect(res.body.data.length).toBe(10);
        expect(res.body.pagination.page).toBe(2);
        expect(res.body.pagination.total).toBe(50);
        expect(res.body.pagination.totalPages).toBe(5);
    });

    it('Sorting by price', async () => {
        const { agency1 } = await seedTestData();

        const t1 = await createTripTemplate(agency1.id, { status: 'ACTIVE', title: 'Expensive' });
        const t2 = await createTripTemplate(agency1.id, { status: 'ACTIVE', title: 'Cheap' });
        const t3 = await createTripTemplate(agency1.id, { status: 'ACTIVE', title: 'Medium' });

        await createTripSession(t1.id, { price: 2000 });
        await createTripSession(t2.id, { price: 500 });
        await createTripSession(t3.id, { price: 1200 });

        const res = await request(app.getHttpServer())
            .get('/trips?sortBy=price&sortOrder=asc')
            .expect(200);

        const prices = res.body.data.map((t: any) => Number(t.sessions?.[0]?.price || 0));
        for (let i = 1; i < prices.length; i++) {
            expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
        }
    });

    // ===== Section 8: Trip Status Transition Tests =====
    it('Agency transitions trip from DRAFT to ACTIVE', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id, { status: 'DRAFT' });

        const res = await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ status: 'ACTIVE' })
            .expect(200);

        expect(res.body.status).toBe('ACTIVE');

        const publicRes = await request(app.getHttpServer())
            .get('/trips')
            .expect(200);

        expect(publicRes.body.data.some((t: any) => t.id === template.id)).toBe(true);
    });

    it('Agency transitions trip from ACTIVE to ARCHIVED', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id, { status: 'ACTIVE' });

        await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ status: 'ARCHIVED' })
            .expect(200);

        const publicRes = await request(app.getHttpServer())
            .get('/trips')
            .expect(200);

        expect(publicRes.body.data.some((t: any) => t.id === template.id)).toBe(false);
    });

    // ===== Section 9: Tenant Isolation Tests =====
    it('Agency can only see own trip templates', async () => {
        const { agency1, agency2 } = await seedTestData();

        const t1 = await createTripTemplate(agency1.id, { title: 'Agency 1 Trip' });
        const t2 = await createTripTemplate(agency2.id, { title: 'Agency 2 Trip' });

        const res = await request(app.getHttpServer())
            .get('/agency/trips')
            .set('Authorization', 'Bearer agency-123')
            .expect(200);

        const tripIds = res.body.data.map((t: any) => t.id);
        expect(tripIds.includes(t1.id)).toBe(true);
        expect(tripIds.includes(t2.id)).toBe(false);
    });

    it('Agency cannot access another agency trip details', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);

        await request(app.getHttpServer())
            .get(`/agency/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-456')
            .expect(404);
    });

    it('Public can view ACTIVE trips from all agencies', async () => {
        const { agency1, agency2 } = await seedTestData();

        const t1 = await createTripTemplate(agency1.id, { status: 'ACTIVE', title: 'Agency 1 Trip' });
        const t2 = await createTripTemplate(agency2.id, { status: 'ACTIVE', title: 'Agency 2 Trip' });
        await createTripTemplate(agency1.id, { status: 'DRAFT', title: 'Draft Trip' });

        const res = await request(app.getHttpServer())
            .get('/trips')
            .expect(200);

        const tripIds = res.body.data.map((t: any) => t.id);
        expect(tripIds.includes(t1.id)).toBe(true);
        expect(tripIds.includes(t2.id)).toBe(true);
        expect(res.body.data.some((t: any) => t.status === 'DRAFT')).toBe(false);
    });

    // ===== Section 10: Trip Image Upload Tests =====
    it('Agency uploads trip images', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');

        const uploadRes = await request(app.getHttpServer())
            .post('/upload')
            .set('Authorization', 'Bearer agency-123')
            .attach('file', fixturePath)
            .expect(201);

        expect(uploadRes.body).toHaveProperty('url');
        expect(uploadRes.body).toHaveProperty('filename');

        const updateRes = await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ images: [uploadRes.body.url] })
            .expect(200);

        expect(updateRes.body.images).toContain(uploadRes.body.url);

        const updated = await db.tripTemplate.findUnique({ where: { id: template.id } });
        expect(updated?.images).toContain(uploadRes.body.url);
    });

    it('Image upload validation', async () => {
        await seedTestData();
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');

        // Valid image should succeed
        const validRes = await request(app.getHttpServer())
            .post('/upload')
            .set('Authorization', 'Bearer agency-123')
            .attach('file', fixturePath)
            .expect(201);

        expect(validRes.body).toHaveProperty('url');
    });

    it('Multiple image uploads for single trip', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id);
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');

        const urls: string[] = [];
        for (let i = 0; i < 3; i++) {
            const res = await request(app.getHttpServer())
                .post('/upload')
                .set('Authorization', 'Bearer agency-123')
                .attach('file', fixturePath)
                .expect(201);
            urls.push(res.body.url);
        }

        const updateRes = await request(app.getHttpServer())
            .patch(`/trips/${template.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ images: urls })
            .expect(200);

        expect(updateRes.body.images).toHaveLength(3);
        expect(updateRes.body.images).toEqual(expect.arrayContaining(urls));
    });

    // ===== Section 11: Trip Search and Pagination Tests =====
    it('Search trips by title or description', async () => {
        const { agency1 } = await seedTestData();

        await createTripTemplate(agency1.id, {
            status: 'ACTIVE',
            title: 'Desert Adventure',
            description: 'Explore the Sahara',
        });
        await createTripTemplate(agency1.id, {
            status: 'ACTIVE',
            title: 'Mountain Trek',
            description: 'Experience the desert mountain peaks',
        });
        await createTripTemplate(agency1.id, {
            status: 'ACTIVE',
            title: 'Beach Holiday',
            description: 'Relax on tropical beaches',
        });

        const res = await request(app.getHttpServer())
            .get('/trips?search=desert')
            .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(
            res.body.data.every(
                (t: any) =>
                    t.title.toLowerCase().includes('desert') ||
                    t.description.toLowerCase().includes('desert')
            )
        ).toBe(true);
    });

    it('Empty result set returns correct pagination', async () => {
        await seedTestData();

        const res = await request(app.getHttpServer())
            .get('/trips?search=nonexistent')
            .expect(200);

        expect(res.body.data).toHaveLength(0);
        expect(res.body.pagination.total).toBe(0);
    });

    // ===== Section 12: Error Handling Tests =====
    it('Get non-existent trip template returns 404', async () => {
        await request(app.getHttpServer())
            .get('/trips/non-existent-id')
            .expect(404);
    });

    it('Update non-existent trip template returns 404', async () => {
        await seedTestData();

        await request(app.getHttpServer())
            .patch('/trips/non-existent-id')
            .set('Authorization', 'Bearer agency-123')
            .send({ title: 'New Title' })
            .expect(404);
    });

    it('Delete non-existent trip template returns 404', async () => {
        await seedTestData();

        await request(app.getHttpServer())
            .delete('/trips/non-existent-id')
            .set('Authorization', 'Bearer agency-123')
            .expect(404);
    });

    it('Create session for non-existent template returns 404', async () => {
        await seedTestData();

        await request(app.getHttpServer())
            .post('/trips/non-existent-id/sessions')
            .set('Authorization', 'Bearer agency-123')
            .send({
                startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                price: 1200,
                deposit: 300,
                totalSeats: 20,
            })
            .expect(404);
    });

    // ===== Section 13: Integration with Reviews =====
    it('Trip template includes review count and average rating', async () => {
        const { agency1, traveler } = await seedTestData();
        const template = await createTripTemplate(agency1.id, { status: 'ACTIVE' });

        const session = await createTripSession(template.id);
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: traveler.id,
                guestsCount: 1,
                totalAmount: session.price,
                fullName: 'Test Traveler',
                phoneNumber: '+12025550123',
                status: 'COMPLETED',
            } as any,
        });
        await db.review.create({
            data: { bookingId: booking.id, tripTemplateId: template.id, travelerId: traveler.id, rating: 5, comment: 'Excellent' },
        });

        const res = await request(app.getHttpServer())
            .get(`/trips/${template.id}`)
            .expect(200);

        expect(res.body._count?.reviews || 0).toBeGreaterThan(0);
    });

    // ===== Section 15: Multilingual content (#546) =====
    it('persists the translations map on create with the fr entry mirrored from the canonical fields', async () => {
        const { agency1 } = await seedTestData();

        const res = await request(app.getHttpServer())
            .post('/trips')
            .set('Authorization', 'Bearer agency-123')
            .send({
                title: 'Aventure dans le désert',
                description: 'Une aventure complète dans le désert marocain',
                category: 'ADVENTURE',
                startLocation: 'Marrakech',
                durationDays: 3,
                durationNights: 2,
                inclusions: ['Transport'],
                images: ['https://example.com/image1.jpg'],
                status: 'DRAFT',
                translations: {
                    ar: { title: 'مغامرة في الصحراء', description: 'مغامرة كاملة في الصحراء المغربية' },
                    en: { title: 'Desert Adventure', description: 'A complete adventure in the Moroccan desert' },
                },
            })
            .expect(201);

        expect(res.body.translations).toEqual({
            // #584: the fr entry also mirrors the canonical sections
            // (here: inclusions) alongside title + description.
            fr: {
                title: 'Aventure dans le désert',
                description: 'Une aventure complète dans le désert marocain',
                inclusions: ['Transport'],
            },
            ar: { title: 'مغامرة في الصحراء', description: 'مغامرة كاملة في الصحراء المغربية' },
            en: { title: 'Desert Adventure', description: 'A complete adventure in the Moroccan desert' },
        });

        const stored = await db.tripTemplate.findUnique({ where: { id: res.body.id } });
        expect((stored as any).translations).toEqual(res.body.translations);
        expect(agency1.id).toBeTruthy();
    });

    it('resolves the public detail + list payloads into the requested locale with French fallback', async () => {
        const { agency1 } = await seedTestData();
        const template = await createTripTemplate(agency1.id, {
            status: 'ACTIVE',
            title: 'Titre français',
            description: 'Description française complète',
            translations: {
                fr: { title: 'Titre français', description: 'Description française complète' },
                ar: { title: 'العنوان بالعربية', description: 'الوصف بالعربية' },
            },
        });

        const ar = await request(app.getHttpServer()).get(`/trips/${template.id}?locale=ar`).expect(200);
        expect(ar.body.title).toBe('العنوان بالعربية');
        expect(ar.body.description).toBe('الوصف بالعربية');

        // English has no entry -> French (never empty).
        const en = await request(app.getHttpServer()).get(`/trips/${template.id}?locale=en`).expect(200);
        expect(en.body.title).toBe('Titre français');
        expect(en.body.description).toBe('Description française complète');

        // No locale at all -> the pre-#546 payload (French columns).
        const plain = await request(app.getHttpServer()).get(`/trips/${template.id}`).expect(200);
        expect(plain.body.title).toBe('Titre français');

        const list = await request(app.getHttpServer()).get('/trips?locale=ar').expect(200);
        const found = (list.body.data || []).find((row: any) => row.id === template.id);
        expect(found?.title).toBe('العنوان بالعربية');
    });

    it('search matches the French columns and the localized texts', async () => {
        const { agency1 } = await seedTestData();
        await createTripTemplate(agency1.id, {
            status: 'ACTIVE',
            title: 'Randonnée Atlas',
            description: 'Une randonnée dans le Haut Atlas',
            translations: {
                fr: { title: 'Randonnée Atlas', description: 'Une randonnée dans le Haut Atlas' },
                ar: { title: 'رحلة الأطلس الكبير', description: 'وصف الرحلة' },
            },
        });

        const byFrench = await request(app.getHttpServer()).get('/trips?q=Randonn%C3%A9e').expect(200);
        expect((byFrench.body.data || []).length).toBeGreaterThan(0);

        const byArabic = await request(app.getHttpServer()).get(`/trips?q=${encodeURIComponent('الأطلس')}`).expect(200);
        expect((byArabic.body.data || []).length).toBeGreaterThan(0);
    });

    it('refuses to publish a trip whose French text is incomplete, publishes a French-only one', async () => {
        const { agency1 } = await seedTestData();
        // Direct-inserted drafts (the API DTO requires French at create;
        // incomplete French can only exist via legacy/direct data).
        const incomplete = await createTripTemplate(agency1.id, {
            status: 'DRAFT',
            title: 'Titre seul',
            description: '',
            translations: { ar: { title: 'عنوان', description: 'وصف كامل' } },
        });
        const frenchOnly = await createTripTemplate(agency1.id, {
            status: 'DRAFT',
            title: 'Voyage complet',
            description: 'Description française complète',
            translations: null,
        });

        await request(app.getHttpServer())
            .patch(`/trips/${incomplete.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ status: 'ACTIVE' })
            .expect(400);

        const published = await request(app.getHttpServer())
            .patch(`/trips/${frenchOnly.id}`)
            .set('Authorization', 'Bearer agency-123')
            .send({ status: 'ACTIVE' })
            .expect(200);
        expect(published.body.status).toBe('ACTIVE');
    });

    // ===== Section 14: Wishlist Integration =====
    it('Trip template includes wishlist count', async () => {
        const { agency1, traveler } = await seedTestData();
        const template = await createTripTemplate(agency1.id, { status: 'ACTIVE' });

        await db.wishlist.create({
            data: { tripTemplateId: template.id, userId: traveler.id },
        });

        const res = await request(app.getHttpServer())
            .get(`/trips/${template.id}`)
            .expect(200);

        expect(res.body._count?.wishlists || 0).toBeGreaterThan(0);
    });
});
