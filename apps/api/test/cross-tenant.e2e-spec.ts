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
import { UsersModule } from '../src/users/users.module';
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
 * #428 (Council P1-01) adds the structural layer beneath the service
 * discipline: tenant-owned rows carry agencyId and are bound by
 * composite foreign keys, so a cross-tenant pairing cannot be written
 * to the database at all — the 'structural tenant isolation' block at
 * the bottom proves the DB itself rejects mismatched rows even when
 * application code (or a future bug) attempts them.
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
    // B22(e) wallet/payout fixtures: legacy custody rows for agency A.
    // No wallet/payout HTTP routes exist anymore — the only surface
    // that can still serialize them is the caller's own data export.
    const WALLET_A = 'ct-wallet-a';
    const WALLET_TX_A = 'ct-wallet-tx-a';
    const PAYOUT_A = 'ct-payout-a';

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
                UsersModule,
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
        await db.walletTransaction.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.wallet.deleteMany();
        await db.message.deleteMany();
        await db.conversation.deleteMany();
        await db.refundEvidence.deleteMany();
        await db.refundCase.deleteMany();
        await db.paymentStatusLedgerEntry.deleteMany();
        await db.paymentTransaction.deleteMany();
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

        const sessionData = (id: string, templateId: string, agencyId: string, availableSeats: number) => ({
            id,
            templateId,
            // #428: sessions are stamped with their template's tenant.
            agencyId,
            startDate: new Date('2027-06-01T09:00:00.000Z'),
            endDate: new Date('2027-06-03T18:00:00.000Z'),
            price: 1200,
            deposit: 300,
            totalSeats: 20,
            availableSeats,
            status: 'OPEN',
        });
        await db.tripSession.create({ data: sessionData(SESSION_A, TEMPLATE_A, AGENCY_A, 17) as any });
        await db.tripSession.create({ data: sessionData(SESSION_A_EMPTY, TEMPLATE_A, AGENCY_A, 20) as any });
        await db.tripSession.create({ data: sessionData(SESSION_B, TEMPLATE_B, AGENCY_B, 20) as any });

        // Booking whose traveller uploaded a manual payment proof that is
        // still awaiting the owning agency's review.
        await db.booking.create({
            data: {
                id: BOOKING_PROOF,
                sessionId: SESSION_A,
                agencyId: AGENCY_A,
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
                agencyId: AGENCY_A,
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
                agencyId: AGENCY_A,
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

        // B22(e): legacy wallet + payout rows belonging to agency A.
        await db.wallet.create({
            data: { id: WALLET_A, agencyId: AGENCY_A, availableBalance: 7777, pendingBalance: 0 } as any,
        });
        await db.walletTransaction.create({
            data: { id: WALLET_TX_A, walletId: WALLET_A, amount: 7777, type: 'CREDIT', reason: 'Cross-tenant probe credit' } as any,
        });
        await db.payoutRequest.create({
            data: { id: PAYOUT_A, agencyId: AGENCY_A, amount: 5555, bankDetails: 'Agency A bank details' } as any,
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

        it('trip emergency contacts ride only on the gated booking read (#251/B23)', async () => {
            await db.agencyProfile.update({
                where: { id: AGENCY_A },
                data: { emergencyContactName: 'CT On-Call Coordinator', emergencyContactPhone: '+212600000001' },
            });

            // Positive control: the traveller holding the booking sees
            // the contacts on their booking read.
            const own = await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenT1)).expect(200);
            expect(bodyText(own)).toContain('+212600000001');

            // A traveller without a booking on the trip is denied the
            // read outright, so the contacts never reach them.
            const foreign = await request(app.getHttpServer()).get(`/bookings/${BOOKING_PAID}`).set(auth(tokenT2));
            expect(foreign.status).toBe(403);
            expect(bodyText(foreign)).not.toContain('+212600000001');

            // The public trip page never carries the contacts.
            const pub = await request(app.getHttpServer()).get(`/trips/${TEMPLATE_A}`).expect(200);
            expect(bodyText(pub)).not.toContain('emergencyContact');
            expect(bodyText(pub)).not.toContain('+212600000001');
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

        it('rejects private-document and external attachments at send time (#251/B23)', async () => {
            const privateRef = await request(app.getHttpServer())
                .post('/messages')
                .set(auth(tokenT1))
                .send({ recipientId: AGENCY_A, content: 'Here is my passport', attachmentUrl: 'private/ct-traveler-1/passport.jpg' });
            expect(privateRef.status).toBe(400);

            const external = await request(app.getHttpServer())
                .post('/messages')
                .set(auth(tokenT1))
                .send({ recipientId: AGENCY_A, content: 'Scan at this link', attachmentUrl: 'https://external.example.com/scan.jpg' });
            expect(external.status).toBe(400);
        });

        it('admin can strip a message attachment; other roles cannot (#251/B23)', async () => {
            const seeded = await db.message.create({
                data: {
                    conversationId: CONVERSATION_ID,
                    senderId: TRAVELER_1,
                    content: 'Attachment moderation probe',
                    attachmentUrl: 'https://cdn.ouiboo.test/trips/ct-agency-a/chat.png',
                },
            });

            const byTraveler = await request(app.getHttpServer())
                .delete(`/admin/messages/${seeded.id}/attachment`)
                .set(auth(tokenT1))
                .send({ reason: 'Trying to moderate my own message' });
            expect(byTraveler.status).toBe(403);
            expect((await db.message.findUnique({ where: { id: seeded.id } }))?.attachmentUrl).toBeTruthy();

            const byAdmin = await request(app.getHttpServer())
                .delete(`/admin/messages/${seeded.id}/attachment`)
                .set(auth(tokenAdmin))
                .send({ reason: 'ID document sent in chat' });
            expect(byAdmin.status).toBe(200);

            expect((await db.message.findUnique({ where: { id: seeded.id } }))?.attachmentUrl).toBeNull();
            const audit = await db.auditLog.findFirst({
                where: { action: 'MESSAGE_ATTACHMENT_REMOVED', targetId: seeded.id },
            });
            expect(audit).toBeTruthy();
        });
    });

    // ------------------------------------------------------------------
    // Wallet / payout surfaces (B22(e) — #425 completion)
    //
    // Custody was removed from the product: the Wallet /
    // WalletTransaction / PayoutRequest tables survive in the schema
    // (legacy rows included in a user's own data export), but no
    // wallet or payout HTTP routes exist. These tests pin both halves:
    // the historical route shapes stay 404 for every actor, and the
    // one remaining serialization surface — GET /users/me/export — is
    // scoped to the caller's own user id, so agency A's wallet and
    // payout rows can never appear in agency B's (or a traveller's)
    // export. If a wallet route or a cross-tenant export leak is ever
    // reintroduced, these tests fail.
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // Structural tenant isolation (#428, Council P1-01)
    //
    // The blocks above prove the SERVICES honour the caller's tenant.
    // This block proves the DATABASE refuses cross-tenant pairings:
    // every write below is attempted directly through Prisma, bypassing
    // all service discipline, and must be rejected by a composite
    // foreign key. Positive controls confirm correctly-stamped rows
    // still insert.
    // ------------------------------------------------------------------
    describe('structural tenant isolation (#428)', () => {
        const futureSession = {
            startDate: new Date('2027-07-01T09:00:00.000Z'),
            endDate: new Date('2027-07-03T18:00:00.000Z'),
            price: 1200,
            totalSeats: 10,
            availableSeats: 10,
            status: 'OPEN',
        };

        it('rejects a session stamped with a foreign tenant for agency A’s template', async () => {
            await expect(db.tripSession.create({
                data: { id: 'ct-session-forged', templateId: TEMPLATE_A, agencyId: AGENCY_B, ...futureSession } as any,
            })).rejects.toThrow();
            expect(await db.tripSession.findUnique({ where: { id: 'ct-session-forged' } })).toBeNull();
        });

        it('rejects a booking stamped with a foreign tenant for agency A’s session', async () => {
            await expect(db.booking.create({
                data: {
                    id: 'ct-booking-forged', sessionId: SESSION_A, agencyId: AGENCY_B,
                    travelerId: TRAVELER_1, totalAmount: 1200, guestsCount: 1, status: 'PENDING',
                } as any,
            })).rejects.toThrow();
            expect(await db.booking.findUnique({ where: { id: 'ct-booking-forged' } })).toBeNull();
        });

        it('rejects an external payment pairing agency B with agency A’s booking', async () => {
            await expect(db.externalPayment.create({
                data: {
                    id: 'ct-payment-forged', bookingId: BOOKING_PROOF, agencyId: AGENCY_B,
                    travelerId: TRAVELER_1, amount: 1200, method: 'MANUAL', custodian: 'AGENCY', stage: 'FULL',
                } as any,
            })).rejects.toThrow();
            expect(await db.externalPayment.findUnique({ where: { id: 'ct-payment-forged' } })).toBeNull();
        });

        it('rejects a payment plan pairing agency B with agency A’s booking/session', async () => {
            await expect(db.bookingPaymentPlan.create({
                data: {
                    id: 'ct-plan-forged', bookingId: BOOKING_UPLOAD, sessionId: SESSION_A, agencyId: AGENCY_B,
                    totalAmount: 1200, depositAmount: 300, balanceAmount: 900,
                    minimumParticipants: 1, confirmationDeadline: new Date('2027-05-01T00:00:00.000Z'),
                    paymentPolicyVersion: 'ct-v1', refundPolicyVersion: 'ct-v1',
                } as any,
            })).rejects.toThrow();
            expect(await db.bookingPaymentPlan.findUnique({ where: { id: 'ct-plan-forged' } })).toBeNull();
        });

        it('rejects a gateway payment transaction stamped with a foreign tenant', async () => {
            await expect(db.paymentTransaction.create({
                data: {
                    id: 'ct-paytx-forged', bookingId: BOOKING_PAID, agencyId: AGENCY_B,
                    amount: 1200, method: 'GATEWAY', status: 'SUCCESS', provider: 'CMI',
                } as any,
            })).rejects.toThrow();
            expect(await db.paymentTransaction.findUnique({ where: { id: 'ct-paytx-forged' } })).toBeNull();
        });

        it('rejects a refund case pairing agency B with agency A’s booking', async () => {
            await expect(db.refundCase.create({
                data: {
                    id: 'ct-refund-forged', bookingId: BOOKING_PAID, travelerId: TRAVELER_1, agencyId: AGENCY_B,
                    requestedAmount: 1200, reason: 'Forged cross-tenant case', policyVersion: 'ct-v1',
                } as any,
            })).rejects.toThrow();
            expect(await db.refundCase.findUnique({ where: { id: 'ct-refund-forged' } })).toBeNull();
        });

        it('rejects a ledger entry whose tenant disagrees with its payment and booking', async () => {
            await expect(db.paymentStatusLedgerEntry.create({
                data: {
                    id: 'ct-ledger-forged', externalPaymentId: PAYMENT_A, bookingId: BOOKING_PAID, agencyId: AGENCY_B,
                    travelerId: TRAVELER_1, type: 'PAYMENT_VERIFIED', amount: 1200,
                    custodian: 'AGENCY', status: 'VERIFIED', source: 'MANUAL_PROOF_REVIEW',
                } as any,
            })).rejects.toThrow();
            expect(await db.paymentStatusLedgerEntry.findUnique({ where: { id: 'ct-ledger-forged' } })).toBeNull();
        });

        it('rejects a review pairing agency A’s booking with agency B’s trip', async () => {
            await expect(db.review.create({
                data: {
                    id: 'ct-review-forged', bookingId: BOOKING_UPLOAD, agencyId: AGENCY_A,
                    travelerId: TRAVELER_1, tripTemplateId: TEMPLATE_B, rating: 5,
                } as any,
            })).rejects.toThrow();
            expect(await db.review.findUnique({ where: { id: 'ct-review-forged' } })).toBeNull();
        });

        it('rejects an invoice line item stamped with a foreign tenant', async () => {
            await expect(db.invoiceLineItem.create({
                data: {
                    id: 'ct-line-forged', invoiceId: INVOICE_A, agencyId: AGENCY_B, bookingId: BOOKING_PAID,
                    description: 'Forged line', bookingDate: new Date(), grossAmount: 1000,
                    commissionRate: 10, commissionAmount: 100,
                } as any,
            })).rejects.toThrow();
            expect(await db.invoiceLineItem.findUnique({ where: { id: 'ct-line-forged' } })).toBeNull();
        });

        it('positive control: correctly-stamped rows insert across the whole chain', async () => {
            const session = await db.tripSession.create({
                data: { id: 'ct-session-b2', templateId: TEMPLATE_B, agencyId: AGENCY_B, ...futureSession } as any,
            });
            expect(session.agencyId).toBe(AGENCY_B);

            const booking = await db.booking.create({
                data: {
                    id: 'ct-booking-b', sessionId: 'ct-session-b2', agencyId: AGENCY_B,
                    travelerId: TRAVELER_2, totalAmount: 1200, guestsCount: 1, status: 'CONFIRMED',
                } as any,
            });
            expect(booking.agencyId).toBe(AGENCY_B);

            const payTx = await db.paymentTransaction.create({
                data: {
                    id: 'ct-paytx-a', bookingId: BOOKING_PAID, agencyId: AGENCY_A,
                    amount: 1200, method: 'GATEWAY', status: 'SUCCESS', provider: 'CMI',
                } as any,
            });
            expect(payTx.agencyId).toBe(AGENCY_A);

            const line = await db.invoiceLineItem.create({
                data: {
                    id: 'ct-line-a', invoiceId: INVOICE_A, agencyId: AGENCY_A, bookingId: BOOKING_PAID,
                    description: 'Legitimate line', bookingDate: new Date(), grossAmount: 1000,
                    commissionRate: 10, commissionAmount: 100,
                } as any,
            });
            expect(line.agencyId).toBe(AGENCY_A);
        });
    });

    describe('wallet and payout surfaces (B22(e))', () => {
        it('exposes no wallet/payout HTTP routes to any actor', async () => {
            for (const token of [tokenA, tokenB, tokenT1, tokenAdmin]) {
                await request(app.getHttpServer()).get('/wallet').set(auth(token)).expect(404);
                await request(app.getHttpServer()).get('/agency/wallet').set(auth(token)).expect(404);
                await request(app.getHttpServer()).get('/payouts').set(auth(token)).expect(404);
                await request(app.getHttpServer()).post('/payout-requests').set(auth(token)).send({ amount: 100 }).expect(404);
                await request(app.getHttpServer()).post('/wallet/payouts').set(auth(token)).send({ amount: 100 }).expect(404);
            }
        });

        it('data export contains only the caller’s own wallet and payout rows', async () => {
            const exportA = await request(app.getHttpServer()).get('/users/me/export').set(auth(tokenA)).expect(200);
            // Positive control: agency A's own export DOES carry its
            // wallet, transaction and payout request — the scoping is
            // per-user, not a blanket omission.
            expect(bodyText(exportA)).toContain(WALLET_A);
            expect(bodyText(exportA)).toContain(WALLET_TX_A);
            expect(bodyText(exportA)).toContain(PAYOUT_A);

            const exportB = await request(app.getHttpServer()).get('/users/me/export').set(auth(tokenB)).expect(200);
            expect(bodyText(exportB)).not.toContain(WALLET_A);
            expect(bodyText(exportB)).not.toContain(WALLET_TX_A);
            expect(bodyText(exportB)).not.toContain(PAYOUT_A);

            const exportT1 = await request(app.getHttpServer()).get('/users/me/export').set(auth(tokenT1)).expect(200);
            expect(bodyText(exportT1)).not.toContain(WALLET_A);
            expect(bodyText(exportT1)).not.toContain(PAYOUT_A);
        });
    });

    // ------------------------------------------------------------------
    // Agency profile PATCH (B22(e) — #425 completion)
    //
    // PATCH /agency/profile resolves the tenant from the JWT, never
    // from the body: a write by agency B must land on B's profile only
    // (bank details stage as a PENDING destination per #421 — the live
    // destination does not change), A's profile must stay
    // byte-identical, and identifier fields smuggled in the body are
    // rejected by the whitelist pipe before anything is written.
    // ------------------------------------------------------------------
    describe('agency profile patch (B22(e))', () => {
        const profileSnapshot = async (id: string) => db.agencyProfile.findUnique({
            where: { id },
            select: {
                companyName: true,
                bankDetails: true,
                pendingBankDetails: true,
                bankDetailsStatus: true,
            },
        });

        it('a profile PATCH writes only to the caller’s own profile', async () => {
            const beforeA = await profileSnapshot(AGENCY_A);

            const res = await request(app.getHttpServer())
                .patch('/agency/profile')
                .set(auth(tokenB))
                .send({ companyName: 'Hijacked B', bankDetails: 'Agency A bank details' });
            expect(res.status).toBe(200);

            // The write landed on B — staged as a pending destination,
            // B's live bank details untouched.
            const afterB = await profileSnapshot(AGENCY_B);
            expect(afterB?.companyName).toBe('Hijacked B');
            expect(afterB?.pendingBankDetails).toBe('Agency A bank details');
            expect(afterB?.bankDetails).toBe('Agency B bank details');
            expect(afterB?.bankDetailsStatus).toBe('PENDING_REVIEW');

            // A's profile is byte-identical.
            expect(await profileSnapshot(AGENCY_A)).toEqual(beforeA);

            // Restore B (profiles persist across tests in this suite).
            await db.agencyProfile.update({
                where: { id: AGENCY_B },
                data: { companyName: 'Cross Tenant Agency B', pendingBankDetails: null, bankDetailsStatus: 'VERIFIED' },
            });
        });

        it('smuggled tenant identifiers in the PATCH body are rejected and change nothing', async () => {
            const beforeA = await profileSnapshot(AGENCY_A);
            const beforeB = await profileSnapshot(AGENCY_B);

            const res = await request(app.getHttpServer())
                .patch('/agency/profile')
                .set(auth(tokenB))
                .send({ id: AGENCY_A, userId: AGENCY_A_USER, agencyId: AGENCY_A, companyName: 'Hijacked via ids' });
            expect(res.status).toBe(400);

            expect(await profileSnapshot(AGENCY_A)).toEqual(beforeA);
            expect(await profileSnapshot(AGENCY_B)).toEqual(beforeB);
        });

        it('a traveller cannot PATCH an agency profile at all', async () => {
            const res = await request(app.getHttpServer())
                .patch('/agency/profile')
                .set(auth(tokenT1))
                .send({ companyName: 'Traveller hijack' });
            expect(res.status).toBe(403);
        });
    });

    // ------------------------------------------------------------------
    // Admin bank-details verification (B22(e) — #425 completion)
    //
    // POST /admin/agencies/:id/bank-details/verify is admin-only by
    // class guard. An agency cannot verify another agency's pending
    // destination, cannot verify its OWN (no self-verification), and a
    // traveller cannot either; the denied attempts must leave the
    // pending submission exactly as staged. The admin positive control
    // proves the route works when the guard passes: the pending
    // destination is promoted to the live one.
    // ------------------------------------------------------------------
    describe('admin bank-details verification (B22(e))', () => {
        const NEW_BANK_DETAILS = 'Agency B NEW bank details';

        const stagePendingForB = async () => {
            await db.agencyProfile.update({
                where: { id: AGENCY_B },
                data: { pendingBankDetails: NEW_BANK_DETAILS, bankDetailsStatus: 'PENDING_REVIEW' },
            });
        };
        const restoreB = async () => {
            await db.agencyProfile.update({
                where: { id: AGENCY_B },
                data: { bankDetails: 'Agency B bank details', pendingBankDetails: null, bankDetailsStatus: 'VERIFIED' },
            });
        };
        const bankState = async (id: string) => db.agencyProfile.findUnique({
            where: { id },
            select: { bankDetails: true, pendingBankDetails: true, bankDetailsStatus: true },
        });

        it('no non-admin can verify a pending bank destination — not even the owning agency itself', async () => {
            await stagePendingForB();
            try {
                for (const token of [tokenA, tokenB, tokenT1]) {
                    const res = await request(app.getHttpServer())
                        .post(`/admin/agencies/${AGENCY_B}/bank-details/verify`)
                        .set(auth(token))
                        .send({ status: 'VERIFIED' });
                    expect(res.status).toBe(403);
                }
                const state = await bankState(AGENCY_B);
                expect(state?.pendingBankDetails).toBe(NEW_BANK_DETAILS);
                expect(state?.bankDetails).toBe('Agency B bank details');
                expect(state?.bankDetailsStatus).toBe('PENDING_REVIEW');
            } finally {
                await restoreB();
            }
        });

        it('positive control: the admin promotes the pending destination to live', async () => {
            await stagePendingForB();
            try {
                await request(app.getHttpServer())
                    .post(`/admin/agencies/${AGENCY_B}/bank-details/verify`)
                    .set(auth(tokenAdmin))
                    .send({ status: 'VERIFIED' })
                    .expect(201);

                const state = await bankState(AGENCY_B);
                expect(state?.bankDetails).toBe(NEW_BANK_DETAILS);
                expect(state?.pendingBankDetails).toBeNull();
                expect(state?.bankDetailsStatus).toBe('VERIFIED');
            } finally {
                await restoreB();
            }
        });
    });
});
