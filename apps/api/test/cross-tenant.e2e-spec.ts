import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseModule } from '../src/database/database.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';
import { AuthModule } from '../src/auth/auth.module';
import { TripsModule } from '../src/trips/trips.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { AgencyModule } from '../src/agency/agency.module';
import { RefundsModule } from '../src/refunds/refunds.module';
import { UploadModule } from '../src/upload/upload.module';
import { MessagesModule } from '../src/messages/messages.module';
import { InvoicesModule } from '../src/invoices/invoices.module';
import { PaymentProvidersModule } from '../src/payment-providers/payment-providers.module';
import { AdminModule } from '../src/admin/admin.module';
import { UserRole } from '@ouiboo/types';
import { tripTemplateFixture } from './e2e-fixtures';

jest.setTimeout(120_000);

/**
 * Council P0-23 (#425) — cross-tenant isolation on a REAL database.
 *
 * The pre-existing tenant tests stub JwtAuthGuard/TenantGuard with
 * header-driven fakes (see trips-crud / booking-lifecycle / payment-records),
 * so they can only prove that services honour a tenant id they are handed.
 * This suite is the negative counterpart the Closed Beta Safety Gate asked
 * for: two real agencies, two travellers and an admin are seeded in the
 * real test database, every actor signs in through the real
 * POST /auth/login, and every request runs the real JwtStrategy (DB user
 * lookup), RolesGuard and TenantGuard (DB agency-profile lookup).
 *
 * For every agency-scoped surface it proves that a foreign tenant cannot
 * read or mutate another tenant's data — including direct-ID access —
 * and that list endpoints never contain the other tenant's rows.
 * Mutations are always double-checked in the database afterwards:
 * a denied request must also have changed nothing.
 *
 * Intentional exceptions, asserted as such below:
 * - The public trip catalogue (GET /trips/:id) serves ACTIVE trips of
 *   VERIFIED agencies to anyone — that is the marketplace storefront.
 *   Drafts stay invisible (404).
 * - Admin is cross-tenant BY DESIGN; the suite asserts admins can read
 *   across tenants while agencies/travellers get 403 on admin routes.
 */
describe('Cross-tenant isolation E2E (cross-tenant.e2e-spec)', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const PASSWORD = 'CrossTenant123!';

    const AGENCY_A_USER = 'ct-agency-a-user';
    const AGENCY_B_USER = 'ct-agency-b-user';
    const TRAVELER_1 = 'ct-traveler-1';
    const TRAVELER_2 = 'ct-traveler-2';
    const ADMIN_USER = 'ct-admin-user';

    const AGENCY_A = 'ct-agency-a';
    const AGENCY_B = 'ct-agency-b';

    const TEMPLATE_A = 'ct-template-a';
    const TEMPLATE_A_DRAFT = 'ct-template-a-draft';
    const TEMPLATE_B = 'ct-template-b';
    const SESSION_A = 'ct-session-a';
    const SESSION_A_EMPTY = 'ct-session-a-empty';
    const SESSION_B = 'ct-session-b';

    const BOOKING_PROOF = 'ct-booking-proof';
    const BOOKING_UPLOAD = 'ct-booking-upload';
    const BOOKING_PAID = 'ct-booking-paid';
    const PROOF_ID = 'ct-proof-1';
    const PROOF_KEY = `private/payment-proofs/${BOOKING_PROOF}/ct-proof.png`;
    const PAYMENT_A = 'ct-payment-a';
    const REFUND_CASE_A = 'ct-refund-case-a';
    const INVOICE_A = 'ct-invoice-a';
    const CONVERSATION_ID = 'ct-conversation-1';
    const MESSAGE_ID = 'ct-message-1';
    const MERCHANT_A = 'CT-MERCH-A-001';

    const PROOF_PNG = path.resolve(__dirname, 'fixtures', 'proof.png');

    let tokenA: string;
    let tokenB: string;
    let tokenT1: string;
    let tokenT2: string;
    let tokenAdmin: string;

    const mockEmailService = {
        sendMail: jest.fn(async () => true),
        sendEmail: jest.fn(async () => true),
        sendBookingNotification: jest.fn(async () => true),
        sendPaymentConfirmation: jest.fn(async () => true),
        sendPasswordResetEmail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp: string) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name?: string) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url: string) => `RESET:${url}`),
    } as unknown as EmailService;

    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
    type Res = { status: number; body: unknown };
    const bodyText = (res: Res) => JSON.stringify(res.body ?? '');

    /** A cross-tenant attempt must never succeed. Services in this codebase
     *  deny with 403 (ownership) or 404 (tenant-scoped lookup); a couple of
     *  older booking paths throw 400 for a foreign id. Any 2xx is a leak. */
    function expectDenied(res: Res) {
        expect([400, 403, 404]).toContain(res.status);
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                DatabaseModule,
                EmailModule,
                AuthModule,
                TripsModule,
                BookingsModule,
                AgencyModule,
                RefundsModule,
                UploadModule,
                MessagesModule,
                InvoicesModule,
                PaymentProvidersModule,
                AdminModule,
            ],
        })
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();

        db = app.get(DatabaseService);

        await clearEverything();
        await seedActors();

        tokenA = await login('ct-agency-a@ouiboo.test');
        tokenB = await login('ct-agency-b@ouiboo.test');
        tokenT1 = await login('ct-traveler-1@ouiboo.test');
        tokenT2 = await login('ct-traveler-2@ouiboo.test');
        tokenAdmin = await login('ct-admin@ouiboo.test');
    });

    afterAll(async () => {
        await clearEverything();
        await app.close();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await clearWorld();
        await seedWorld();
    });

    async function login(email: string): Promise<string> {
        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password: PASSWORD });
        if (res.status !== 201 || !res.body?.accessToken) {
            throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
        }
        return res.body.accessToken as string;
    }

    async function clearWorld() {
        if (!db) return;
        await db.message.deleteMany();
        await db.conversation.deleteMany();
        await db.refundEvidence.deleteMany();
        await db.refundCase.deleteMany();
        await db.paymentStatusLedgerEntry.deleteMany();
        await db.paymentAttempt.deleteMany();
        await db.externalPayment.deleteMany();
        await db.agencyPaymentProfile.deleteMany();
        await db.invoiceLineItem.deleteMany();
        await db.invoice.deleteMany();
        await db.paymentProof.deleteMany();
        await db.bookingPaymentPlan.deleteMany();
        await db.booking.deleteMany();
        await db.tripSession.deleteMany();
        await db.itineraryDay.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.auditLog.deleteMany();
    }

    async function clearEverything() {
        if (!db) return;
        await clearWorld();
        await db.review.deleteMany();
        await db.wishlist.deleteMany();
        await db.walletTransaction.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.wallet.deleteMany();
        await db.refreshToken.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.user.deleteMany();
    }

    async function seedActors() {
        const passwordHash = await bcrypt.hash(PASSWORD, 10);
        await db.user.createMany({
            data: [
                { id: AGENCY_A_USER, email: 'ct-agency-a@ouiboo.test', name: 'Cross Tenant Agency A', password: passwordHash, role: UserRole.Agency, isEmailVerified: true },
                { id: AGENCY_B_USER, email: 'ct-agency-b@ouiboo.test', name: 'Cross Tenant Agency B', password: passwordHash, role: UserRole.Agency, isEmailVerified: true },
                { id: TRAVELER_1, email: 'ct-traveler-1@ouiboo.test', name: 'Cross Tenant Traveler One', password: passwordHash, role: UserRole.Traveler, isEmailVerified: true },
                { id: TRAVELER_2, email: 'ct-traveler-2@ouiboo.test', name: 'Cross Tenant Traveler Two', password: passwordHash, role: UserRole.Traveler, isEmailVerified: true },
                { id: ADMIN_USER, email: 'ct-admin@ouiboo.test', name: 'Cross Tenant Admin', password: passwordHash, role: UserRole.Admin, isEmailVerified: true },
            ] as any,
        });

        const verifiedAgency = {
            verificationStatus: 'VERIFIED',
            subscriptionStatus: 'ACTIVE',
            travelLicenceStatus: 'VERIFIED',
            travelLicenceType: 'ODV',
            licenceExpiry: new Date('2030-01-01T00:00:00.000Z'),
            insuranceStatus: 'VERIFIED',
            insuranceExpiry: new Date('2030-01-01T00:00:00.000Z'),
            bankDetailsStatus: 'VERIFIED',
            bankDetailsVerifiedAt: new Date(),
        } as const;

        await db.agencyProfile.create({
            data: {
                id: AGENCY_A,
                userId: AGENCY_A_USER,
                companyName: 'Cross Tenant Agency A',
                ice: 'CT-ICE-000A',
                patente: 'CT-PAT-000A',
                rib: 'CT-RIB-000A',
                bankDetails: 'Agency A bank details',
                bankAccountHolderName: 'Cross Tenant Agency A',
                travelLicenceNumber: 'CT-LIC-A',
                insuranceInsurer: 'CT Insurance',
                insurancePolicyNumber: 'CT-POL-A',
                ...verifiedAgency,
            } as any,
        });
        await db.agencyProfile.create({
            data: {
                id: AGENCY_B,
                userId: AGENCY_B_USER,
                companyName: 'Cross Tenant Agency B',
                ice: 'CT-ICE-000B',
                patente: 'CT-PAT-000B',
                rib: 'CT-RIB-000B',
                bankDetails: 'Agency B bank details',
                bankAccountHolderName: 'Cross Tenant Agency B',
                travelLicenceNumber: 'CT-LIC-B',
                insuranceInsurer: 'CT Insurance',
                insurancePolicyNumber: 'CT-POL-B',
                ...verifiedAgency,
            } as any,
        });
    }

    async function seedWorld() {
        await db.tripTemplate.create({
            data: tripTemplateFixture({ id: TEMPLATE_A, agencyId: AGENCY_A, title: 'Atlas Trek — Agency A', status: 'ACTIVE' } as any),
        });
        await db.tripTemplate.create({
            data: tripTemplateFixture({ id: TEMPLATE_A_DRAFT, agencyId: AGENCY_A, title: 'Unpublished Draft — Agency A', status: 'DRAFT' } as any),
        });
        await db.tripTemplate.create({
            data: tripTemplateFixture({ id: TEMPLATE_B, agencyId: AGENCY_B, title: 'Coastal Ride — Agency B', status: 'ACTIVE' } as any),
        });

        const sessionData = (id: string, templateId: string, availableSeats: number) => ({
            id,
            templateId,
            startDate: new Date('2027-06-01T09:00:00.000Z'),
            endDate: new Date('2027-06-03T18:00:00.000Z'),
            price: 1200,
            deposit: 300,
            totalSeats: 20,
            availableSeats,
            status: 'OPEN',
        });
        await db.tripSession.create({ data: sessionData(SESSION_A, TEMPLATE_A, 17) as any });
        await db.tripSession.create({ data: sessionData(SESSION_A_EMPTY, TEMPLATE_A, 20) as any });
        await db.tripSession.create({ data: sessionData(SESSION_B, TEMPLATE_B, 20) as any });

        // Booking whose traveller uploaded a manual payment proof that is
        // still awaiting the owning agency's review.
        await db.booking.create({
            data: {
                id: BOOKING_PROOF,
                sessionId: SESSION_A,
                travelerId: TRAVELER_1,
                status: 'AWAITING_VALIDATION',
                paymentStatus: 'UNPAID',
                paymentMethod: 'MANUAL',
                totalAmount: 1200,
                guestsCount: 1,
                fullName: 'Cross Tenant Traveler One',
            } as any,
        });
        await db.paymentProof.create({
            data: { id: PROOF_ID, bookingId: BOOKING_PROOF, imageUrl: PROOF_KEY, status: 'PENDING' } as any,
        });
        await db.booking.update({
            where: { id: BOOKING_PROOF },
            data: { paymentProofId: PROOF_ID, paymentProofUrl: PROOF_KEY } as any,
        });
        writeProofFile();

        // Booking with no proof yet — target of the upload-flow test.
        await db.booking.create({
            data: {
                id: BOOKING_UPLOAD,
                sessionId: SESSION_A,
                travelerId: TRAVELER_1,
                status: 'AWAITING_VALIDATION',
                paymentStatus: 'UNPAID',
                paymentMethod: 'MANUAL',
                totalAmount: 1200,
                guestsCount: 1,
                fullName: 'Cross Tenant Traveler One',
            } as any,
        });

        // Fully paid booking with a verified external payment and an open
        // refund case — the payments/refunds target.
        await db.booking.create({
            data: {
                id: BOOKING_PAID,
                sessionId: SESSION_A,
                travelerId: TRAVELER_1,
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                paymentMethod: 'MANUAL',
                totalAmount: 1200,
                guestsCount: 1,
                fullName: 'Cross Tenant Traveler One',
            } as any,
        });
        await db.externalPayment.create({
            data: {
                id: PAYMENT_A,
                bookingId: BOOKING_PAID,
                agencyId: AGENCY_A,
                travelerId: TRAVELER_1,
                amount: 1200,
                method: 'MANUAL',
                custodian: 'AGENCY',
                status: 'VERIFIED',
                verifiedAt: new Date(),
                stage: 'FULL',
            } as any,
        });
        await db.refundCase.create({
            data: {
                id: REFUND_CASE_A,
                bookingId: BOOKING_PAID,
                travelerId: TRAVELER_1,
                agencyId: AGENCY_A,
                originalPaymentId: PAYMENT_A,
                requestedAmount: 1200,
                reason: 'Traveller requested a refund',
                policyVersion: 'ct-v1',
                status: 'ELIGIBILITY_REVIEW',
            } as any,
        });

        await db.invoice.create({
            data: {
                id: INVOICE_A,
                number: 'CT-INV-2026-001',
                agencyId: AGENCY_A,
                periodStart: new Date('2026-09-01T00:00:00.000Z'),
                periodEnd: new Date('2026-09-30T00:00:00.000Z'),
                commissionRate: 10,
                subtotalAmount: 1000,
                totalAmount: 1000,
                status: 'ISSUED',
                agencyName: 'Cross Tenant Agency A',
                agencyIce: 'CT-ICE-000A',
            } as any,
        });

        await db.agencyPaymentProfile.create({
            data: {
                id: 'ct-payment-profile-a',
                agencyId: AGENCY_A,
                provider: 'manual',
                externalMerchantId: MERCHANT_A,
                onboardingStatus: 'CONNECTED',
                paymentEnabled: true,
            } as any,
        });

        await db.conversation.create({
            data: { id: CONVERSATION_ID, travelerId: TRAVELER_1, agencyId: AGENCY_A } as any,
        });
        await db.message.create({
            data: {
                id: MESSAGE_ID,
                conversationId: CONVERSATION_ID,
                senderId: TRAVELER_1,
                content: 'Cross-tenant probe message',
            } as any,
        });
    }

    function writeProofFile() {
        const target = path.resolve(process.cwd(), 'private-uploads', 'payment-proofs', BOOKING_PROOF, 'ct-proof.png');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(PROOF_PNG, target);
    }

    // ------------------------------------------------------------------
    // Authentication / role gates
    // ------------------------------------------------------------------
    describe('authentication and role gates', () => {
        it('rejects unauthenticated access to tenant surfaces', async () => {
            await request(app.getHttpServer()).get('/agency/trips').expect(401);
            await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).expect(401);
            await request(app.getHttpServer()).get('/agency/refunds').expect(401);
        });

        it('rejects a wrong password at the real login endpoint', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'ct-agency-a@ouiboo.test', password: 'WrongPassword123!' })
                .expect(401);
        });

        it('denies non-admins on admin routes while the admin reads across tenants by design', async () => {
            await request(app.getHttpServer()).get('/admin/bookings').set(auth(tokenA)).expect(403);
            await request(app.getHttpServer()).get('/admin/bookings').set(auth(tokenT1)).expect(403);

            const res = await request(app.getHttpServer()).get('/admin/bookings').set(auth(tokenAdmin)).expect(200);
            expect(bodyText(res)).toContain(BOOKING_PAID);
        });
    });

    // ------------------------------------------------------------------
    // Trips & sessions
    // ------------------------------------------------------------------
    describe('trips and sessions', () => {
        it('agency trip lists contain only the caller’s own templates', async () => {
            const listA = await request(app.getHttpServer()).get('/agency/trips').set(auth(tokenA)).expect(200);
            expect(bodyText(listA)).toContain(TEMPLATE_A);
            expect(bodyText(listA)).not.toContain(TEMPLATE_B);

            const listB = await request(app.getHttpServer()).get('/agency/trips').set(auth(tokenB)).expect(200);
            expect(bodyText(listB)).toContain(TEMPLATE_B);
            expect(bodyText(listB)).not.toContain(TEMPLATE_A);
        });

        it('denies direct-ID read of another agency’s template in the agency surface', async () => {
            const res = await request(app.getHttpServer()).get(`/agency/trips/${TEMPLATE_A}`).set(auth(tokenB));
            expect(res.status).toBe(404);
        });

        it('denies update/archive of another agency’s template and changes nothing', async () => {
            const patch = await request(app.getHttpServer())
                .patch(`/trips/${TEMPLATE_A}`)
                .set(auth(tokenB))
                .send({ title: 'Hijacked by Agency B' });
            expectDenied(patch);

            const archive = await request(app.getHttpServer()).post(`/trips/${TEMPLATE_A}/archive`).set(auth(tokenB));
            expectDenied(archive);

            const template = await db.tripTemplate.findUnique({ where: { id: TEMPLATE_A } });
            expect(template?.title).toBe('Atlas Trek — Agency A');
            expect(template?.status).toBe('ACTIVE');
        });

        it('denies deleting another agency’s draft template', async () => {
            const res = await request(app.getHttpServer()).delete(`/trips/${TEMPLATE_A_DRAFT}`).set(auth(tokenB));
            expectDenied(res);
            expect(await db.tripTemplate.findUnique({ where: { id: TEMPLATE_A_DRAFT } })).toBeTruthy();
        });

        it('denies session create/update/delete on another agency’s template', async () => {
            const create = await request(app.getHttpServer())
                .post(`/trips/${TEMPLATE_A}/sessions`)
                .set(auth(tokenB))
                .send({
                    startDate: '2027-07-01T09:00:00.000Z',
                    endDate: '2027-07-03T18:00:00.000Z',
                    price: 900,
                    deposit: 200,
                    totalSeats: 10,
                });
            expectDenied(create);
            expect(await db.tripSession.count({ where: { templateId: TEMPLATE_A } })).toBe(2);

            const update = await request(app.getHttpServer())
                .patch(`/trips/${TEMPLATE_A}/sessions/${SESSION_A_EMPTY}`)
                .set(auth(tokenB))
                .send({ price: 1 });
            expectDenied(update);
            const session = await db.tripSession.findUnique({ where: { id: SESSION_A_EMPTY } });
            expect(Number(session?.price)).toBe(1200);

            const remove = await request(app.getHttpServer())
                .delete(`/trips/${TEMPLATE_A}/sessions/${SESSION_A_EMPTY}`)
                .set(auth(tokenB));
            expectDenied(remove);
            expect(await db.tripSession.findUnique({ where: { id: SESSION_A_EMPTY } })).toBeTruthy();
        });

        it('keeps drafts out of the public catalogue while ACTIVE trips stay public by design', async () => {
            await request(app.getHttpServer()).get(`/trips/${TEMPLATE_A_DRAFT}`).expect(404);
            await request(app.getHttpServer()).get(`/trips/${TEMPLATE_A}`).expect(200);
        });

        it('positive control: the owner can update and delete its own draft', async () => {
            const patch = await request(app.getHttpServer())
                .patch(`/trips/${TEMPLATE_A}`)
                .set(auth(tokenA))
                .send({ title: 'Atlas Trek — Renamed' });
            expect(patch.status).toBe(200);

            await request(app.getHttpServer()).delete(`/trips/${TEMPLATE_A_DRAFT}`).set(auth(tokenA)).expect(200);
            expect(await db.tripTemplate.findUnique({ where: { id: TEMPLATE_A_DRAFT } })).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // Bookings
    // ------------------------------------------------------------------
    describe('bookings', () => {
        it('denies direct-ID booking reads to a foreign traveller and a foreign agency', async () => {
            const byTraveler = await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenT2));
            expect(byTraveler.status).toBe(403);

            const byAgency = await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenB));
            expect(byAgency.status).toBe(403);
        });

        it('positive control: booking owner, owning agency and admin can read the booking', async () => {
            await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenT1)).expect(200);
            await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenA)).expect(200);
            await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenAdmin)).expect(200);
        });

        it('booking lists never leak across travellers or agencies', async () => {
            const mine = await request(app.getHttpServer()).get('/bookings/my-bookings').set(auth(tokenT2)).expect(200);
            expect(bodyText(mine)).not.toContain(BOOKING_PAID);
            expect(bodyText(mine)).not.toContain(BOOKING_PROOF);

            const agencyBookings = await request(app.getHttpServer()).get('/agency/bookings').set(auth(tokenB)).expect(200);
            expect(bodyText(agencyBookings)).not.toContain(BOOKING_PAID);
            expect(bodyText(agencyBookings)).not.toContain(BOOKING_PROOF);

            const ownBookings = await request(app.getHttpServer()).get('/agency/bookings').set(auth(tokenA)).expect(200);
            expect(bodyText(ownBookings)).toContain(BOOKING_PAID);
        });

        it('denies cancelling another traveller’s booking', async () => {
            const res = await request(app.getHttpServer()).patch(`/bookings/${BOOKING_PAID}/cancel`).set(auth(tokenT2));
            expectDenied(res);
            const booking = await db.booking.findUnique({ where: { id: BOOKING_PAID } });
            expect(booking?.status).toBe('CONFIRMED');
        });

        it('payment-proof flow: foreign actors are denied at upload, download, review and bank confirmation', async () => {
            // A foreign traveller cannot attach a proof to someone else's booking.
            const foreignUpload = await request(app.getHttpServer())
                .post(`/bookings/${BOOKING_UPLOAD}/payment-proof`)
                .set(auth(tokenT2))
                .attach('file', PROOF_PNG);
            expectDenied(foreignUpload);
            expect(await db.paymentProof.findUnique({ where: { bookingId: BOOKING_UPLOAD } })).toBeNull();

            // The owner uploads successfully (positive control).
            const ownUpload = await request(app.getHttpServer())
                .post(`/bookings/${BOOKING_UPLOAD}/payment-proof`)
                .set(auth(tokenT1))
                .attach('file', PROOF_PNG);
            expect(ownUpload.status).toBe(201);
            const proof = await db.paymentProof.findUnique({ where: { bookingId: BOOKING_UPLOAD } });
            expect(proof?.status).toBe('PENDING');

            // Foreign traveller and foreign agency cannot download the proof.
            const dlTraveler = await request(app.getHttpServer())
                .get(`/bookings/${BOOKING_UPLOAD}/payment-proof/download`)
                .set(auth(tokenT2));
            expectDenied(dlTraveler);
            const dlAgency = await request(app.getHttpServer())
                .get(`/bookings/${BOOKING_UPLOAD}/payment-proof/download`)
                .set(auth(tokenB));
            expectDenied(dlAgency);

            // The owning agency downloads the exact bytes.
            const dlOwner = await request(app.getHttpServer())
                .get(`/bookings/${BOOKING_UPLOAD}/payment-proof/download`)
                .set(auth(tokenA))
                .buffer(true)
                .parse((incoming, callback) => {
                    const chunks: Buffer[] = [];
                    incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
                    incoming.on('end', () => callback(null, Buffer.concat(chunks)));
                });
            expect(dlOwner.status).toBe(200);
            expect(Buffer.compare(dlOwner.body as Buffer, fs.readFileSync(PROOF_PNG))).toBe(0);

            // A foreign agency cannot review the proof; the owner can.
            const foreignReview = await request(app.getHttpServer())
                .patch(`/bookings/${BOOKING_UPLOAD}/verify-payment`)
                .set(auth(tokenB))
                .send({ approved: true });
            expectDenied(foreignReview);
            expect((await db.paymentProof.findUnique({ where: { bookingId: BOOKING_UPLOAD } }))?.status).toBe('PENDING');

            const ownReview = await request(app.getHttpServer())
                .patch(`/bookings/${BOOKING_UPLOAD}/verify-payment`)
                .set(auth(tokenA))
                .send({ approved: true });
            expect(ownReview.status).toBe(200);
            expect((await db.paymentProof.findUnique({ where: { bookingId: BOOKING_UPLOAD } }))?.status).toBe('ACCEPTED');

            // A foreign agency cannot confirm the bank settlement either.
            const foreignConfirm = await request(app.getHttpServer())
                .patch(`/bookings/${BOOKING_UPLOAD}/confirm-bank-payment`)
                .set(auth(tokenB))
                .send({ confirmedAmount: 1200, bankReference: 'CT-FOREIGN-TRX' });
            expectDenied(foreignConfirm);
            const payment = await db.externalPayment.findFirst({ where: { bookingId: BOOKING_UPLOAD } });
            expect(payment?.bankConfirmedAt).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // Payments (external payment facts)
    // ------------------------------------------------------------------
    describe('payments', () => {
        it('agency payment lists contain only the caller’s own payments', async () => {
            const listA = await request(app.getHttpServer()).get('/agency/payments').set(auth(tokenA)).expect(200);
            expect(bodyText(listA)).toContain(PAYMENT_A);

            const listB = await request(app.getHttpServer()).get('/agency/payments').set(auth(tokenB)).expect(200);
            expect(bodyText(listB)).not.toContain(PAYMENT_A);
            expect(bodyText(listB)).not.toContain(BOOKING_PAID);
        });

        it('denies travellers on the agency payments surface', async () => {
            await request(app.getHttpServer()).get('/agency/payments').set(auth(tokenT1)).expect(403);
        });
    });

    // ------------------------------------------------------------------
    // Refunds
    // ------------------------------------------------------------------
    describe('refunds', () => {
        it('denies a foreign agency reading or acting on another agency’s refund case', async () => {
            const read = await request(app.getHttpServer()).get(`/agency/refunds/${REFUND_CASE_A}`).set(auth(tokenB));
            expectDenied(read);

            const approve = await request(app.getHttpServer())
                .post(`/agency/refunds/${REFUND_CASE_A}/approve`)
                .set(auth(tokenB))
                .send({});
            expectDenied(approve);

            const evidence = await request(app.getHttpServer())
                .post(`/agency/refunds/${REFUND_CASE_A}/evidence`)
                .set(auth(tokenB))
                .send({ reference: 'CT-FOREIGN-REF', proofUrl: `private/${AGENCY_B_USER}/proof.png` });
            expectDenied(evidence);

            const refundCase = await db.refundCase.findUnique({ where: { id: REFUND_CASE_A } });
            expect(refundCase?.status).toBe('ELIGIBILITY_REVIEW');
            expect(await db.refundEvidence.count({ where: { refundCaseId: REFUND_CASE_A } })).toBe(0);
        });

        it('denies a foreign agency opening a refund case on another agency’s booking', async () => {
            const res = await request(app.getHttpServer())
                .post('/agency/refunds')
                .set(auth(tokenB))
                .send({ bookingId: BOOKING_PAID });
            expectDenied(res);
            expect(await db.refundCase.count({ where: { bookingId: BOOKING_PAID } })).toBe(1);
        });

        it('refund lists are scoped to the caller on both sides', async () => {
            const listB = await request(app.getHttpServer()).get('/agency/refunds').set(auth(tokenB)).expect(200);
            expect(bodyText(listB)).not.toContain(REFUND_CASE_A);

            const mineT2 = await request(app.getHttpServer()).get('/refunds/mine').set(auth(tokenT2)).expect(200);
            expect(bodyText(mineT2)).not.toContain(REFUND_CASE_A);

            const mineT1 = await request(app.getHttpServer()).get('/refunds/mine').set(auth(tokenT1)).expect(200);
            expect(bodyText(mineT1)).toContain(REFUND_CASE_A);
        });

        it('denies a foreign traveller reading, confirming or requesting against another traveller’s refund', async () => {
            const read = await request(app.getHttpServer()).get(`/refunds/mine/${REFUND_CASE_A}`).set(auth(tokenT2));
            expectDenied(read);

            const confirm = await request(app.getHttpServer())
                .post(`/refunds/mine/${REFUND_CASE_A}/confirm-receipt`)
                .set(auth(tokenT2));
            expectDenied(confirm);

            const requestRefund = await request(app.getHttpServer())
                .post('/refunds/request')
                .set(auth(tokenT2))
                .send({ bookingId: BOOKING_PAID, reason: 'Not my booking' });
            expectDenied(requestRefund);

            const refundCase = await db.refundCase.findUnique({ where: { id: REFUND_CASE_A } });
            expect(refundCase?.travellerConfirmedAt).toBeNull();
            expect(await db.refundCase.count({ where: { bookingId: BOOKING_PAID } })).toBe(1);
        });

        it('positive control: the owning agency and the traveller can read the case', async () => {
            await request(app.getHttpServer()).get(`/agency/refunds/${REFUND_CASE_A}`).set(auth(tokenA)).expect(200);
            await request(app.getHttpServer()).get(`/refunds/mine/${REFUND_CASE_A}`).set(auth(tokenT1)).expect(200);
        });

        it('denies agencies the admin refund-audit action while the admin can audit', async () => {
            await request(app.getHttpServer()).post(`/admin/refunds/${REFUND_CASE_A}/audit`).set(auth(tokenA)).expect(403);
            const res = await request(app.getHttpServer()).post(`/admin/refunds/${REFUND_CASE_A}/audit`).set(auth(tokenAdmin));
            expect([200, 201]).toContain(res.status);
        });
    });

    // ------------------------------------------------------------------
    // Uploads & private media
    // ------------------------------------------------------------------
    describe('uploads and private media', () => {
        it('private identity documents are owner-only at signed-url issuance', async () => {
            const upload = await request(app.getHttpServer())
                .post('/upload')
                .set(auth(tokenA))
                .field('intent', 'identity-document')
                .attach('file', PROOF_PNG);
            expect(upload.status).toBe(201);
            const key = upload.body.filename as string;
            expect(key.startsWith(`private/${AGENCY_A_USER}/`)).toBe(true);

            const foreignAgency = await request(app.getHttpServer())
                .get('/upload/signed-url')
                .query({ key })
                .set(auth(tokenB));
            expect(foreignAgency.status).toBe(403);

            const foreignTraveler = await request(app.getHttpServer())
                .get('/upload/signed-url')
                .query({ key })
                .set(auth(tokenT1));
            expect(foreignTraveler.status).toBe(403);

            // The owner gets a signed URL whose token serves the file bytes…
            const own = await request(app.getHttpServer())
                .get('/upload/signed-url')
                .query({ key })
                .set(auth(tokenA));
            expect(own.status).toBe(200);
            const token = new URL(own.body.url as string).searchParams.get('token');
            expect(token).toBeTruthy();
            const served = await request(app.getHttpServer()).get('/upload/file').query({ token });
            expect(served.status).toBe(200);

            // …while a forged token is rejected.
            const forged = await request(app.getHttpServer()).get('/upload/file').query({ token: 'forged-token' });
            expect([400, 401, 403]).toContain(forged.status);
        });

        it('the public media endpoint never serves private files', async () => {
            // The stored proof key has four segments (private/payment-proofs/
            // {bookingId}/{file}); the media routes only define two- and
            // three-segment patterns, so this shape 404s on routing, while
            // the three-segment private shape is refused with 403 (next
            // test). Either way the bytes are never served.
            const res = await request(app.getHttpServer())
                .get(`/media/private/payment-proofs/${BOOKING_PROOF}/ct-proof.png`);
            expect([403, 404]).toContain(res.status);
            // …and what comes back is an error body, never the image bytes.
            expect(res.headers['content-type'] ?? '').not.toContain('image/png');
        });

        it('payment-proof files are not reachable through the public media endpoint either', async () => {
            const res = await request(app.getHttpServer())
                .get(`/media/private/${AGENCY_A_USER}/anything.png`);
            expect(res.status).toBe(403);
        });
    });

    // ------------------------------------------------------------------
    // Invoices & payment profile
    // ------------------------------------------------------------------
    describe('invoices and payment profile', () => {
        it('denies direct-ID invoice reads and PDF downloads to a foreign agency', async () => {
            const read = await request(app.getHttpServer()).get(`/agency/invoices/${INVOICE_A}`).set(auth(tokenB));
            expect(read.status).toBe(404);

            const pdf = await request(app.getHttpServer()).get(`/agency/invoices/${INVOICE_A}/pdf`).set(auth(tokenB));
            expect(pdf.status).toBe(404);

            const listB = await request(app.getHttpServer()).get('/agency/invoices').set(auth(tokenB)).expect(200);
            expect(bodyText(listB)).not.toContain(INVOICE_A);

            await request(app.getHttpServer()).get(`/agency/invoices/${INVOICE_A}`).set(auth(tokenA)).expect(200);
        });

        it('payment profile reads return only the caller’s own merchant identity', async () => {
            const own = await request(app.getHttpServer()).get('/agency/payment-profile').set(auth(tokenA)).expect(200);
            expect(bodyText(own)).toContain(MERCHANT_A);

            const foreign = await request(app.getHttpServer()).get('/agency/payment-profile').set(auth(tokenB)).expect(200);
            expect(bodyText(foreign)).not.toContain(MERCHANT_A);

            await request(app.getHttpServer()).get('/agency/payment-profile').set(auth(tokenT1)).expect(403);
        });
    });

    // ------------------------------------------------------------------
    // Messages
    // ------------------------------------------------------------------
    describe('messages', () => {
        it('denies conversation reads to non-participants on both sides', async () => {
            const byTraveler = await request(app.getHttpServer())
                .get(`/messages/conversations/${CONVERSATION_ID}`)
                .set(auth(tokenT2));
            expect(byTraveler.status).toBe(403);

            const byAgency = await request(app.getHttpServer())
                .get(`/messages/conversations/${CONVERSATION_ID}`)
                .set(auth(tokenB));
            expect(byAgency.status).toBe(403);

            const listT2 = await request(app.getHttpServer()).get('/messages/conversations').set(auth(tokenT2)).expect(200);
            expect(bodyText(listT2)).not.toContain(CONVERSATION_ID);
        });

        it('positive control: both participants can read the conversation', async () => {
            const byTraveler = await request(app.getHttpServer())
                .get(`/messages/conversations/${CONVERSATION_ID}`)
                .set(auth(tokenT1))
                .expect(200);
            expect(bodyText(byTraveler)).toContain('Cross-tenant probe message');

            await request(app.getHttpServer())
                .get(`/messages/conversations/${CONVERSATION_ID}`)
                .set(auth(tokenA))
                .expect(200);
        });

        it('denies deleting a message the caller did not send', async () => {
            const res = await request(app.getHttpServer()).delete(`/messages/${MESSAGE_ID}`).set(auth(tokenT2));
            expectDenied(res);
            expect(await db.message.findUnique({ where: { id: MESSAGE_ID } })).toBeTruthy();
        });
    });
});
