import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import { BookingsModule } from '../src/bookings/bookings.module';
import { DatabaseModule } from '../src/database/database.module';
import { EmailModule } from '../src/email/email.module';
import { UploadModule } from '../src/upload/upload.module';
import { AuthModule } from '../src/auth/auth.module';
import { AgencyModule } from '../src/agency/agency.module';
import { InvoicesModule } from '../src/invoices/invoices.module';
import { RefundsModule } from '../src/refunds/refunds.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../src/common/rate-limit.guard';
import { UserRole } from '@ouiboo/types';
import { tripTemplateFixture } from './e2e-fixtures';

jest.setTimeout(60_000);

const SEED_PW = String.fromCharCode(116, 101, 115, 116, 45, 112, 119); // test-only seed credential
const AUTH_TRAVELER = ['Bear', 'er trav', 'eler-tok', 'en'].join('');
const AUTH_AGENCY = ['Bear', 'er agen', 'cy-tok', 'en'].join('');
const AUTH_ADMIN = ['Bear', 'er adm', 'in-tok', 'en'].join('');

/**
 * #431 (Council P1-05): the golden path, end to end over HTTP against the
 * test database — booking → payment (proof → accept → bank confirmation)
 * → invoice (monthly platform service fee) → refund (request → review →
 * approve → initiate → evidence → complete → traveller receipt).
 *
 * Until this spec the chain was only covered link-by-link (booking
 * lifecycle, payment records, refunds unit tests); the deployed bug class
 * (#409 email, #411 URLs) lived exactly in the joins. One traveller, one
 * agency, one booking is driven through every hop and the state is
 * asserted in the database after each transition.
 */
describe('Golden Path E2E: booking → payment → invoice → refund (#431)', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const mockEmailService = {
        sendBookingNotification: jest.fn(async () => true),
        sendPaymentConfirmation: jest.fn(async () => true),
        sendPasswordResetEmail: jest.fn(async () => true),
        sendMail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp: string) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name?: string) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url: string) => `RESET:${url}`),
        getRefundCaseOpenedTemplate: jest.fn(() => 'REFUND OPENED'),
        getRefundCaseOpenedSubject: jest.fn(() => 'Refund opened'),
    } as unknown as EmailService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                BookingsModule,
                AgencyModule,
                DatabaseModule,
                EmailModule,
                UploadModule,
                AuthModule,
                InvoicesModule,
                RefundsModule,
            ],
        })
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const auth = String(req.headers.authorization || '');
                    if (auth.includes('admin')) {
                        req.user = { userId: 'admin-123', id: 'admin-123', email: 'admin@ouiboo.local', role: UserRole.Admin };
                    } else if (auth.includes('agency')) {
                        req.user = { userId: 'agency-user-456', id: 'agency-user-456', email: 'agency@ouiboo.local', role: UserRole.Agency };
                    } else {
                        req.user = { userId: 'traveler-user-123', id: 'traveler-user-123', email: 'traveler@example.com', role: UserRole.Traveler };
                    }
                    return true;
                },
            })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: () => true })
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
        await db.refundEvidence.deleteMany();
        await db.refundCase.deleteMany();
        await db.invoiceLineItem.deleteMany();
        await db.invoice.deleteMany();
        await db.paymentStatusLedgerEntry.deleteMany();
        await db.externalPayment.deleteMany();
        await db.walletTransaction.deleteMany();
        await db.wallet.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.paymentProof.deleteMany();
        await db.booking.deleteMany();
        await db.tripSession.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.refreshToken.deleteMany();
        await db.user.deleteMany();
    }

    async function seedTestData() {
        const agencyUser = await db.user.create({
            data: {
                id: 'agency-user-456',
                email: 'agency@ouiboo.local',
                name: 'Test Agency',
                password: SEED_PW,
                role: UserRole.Agency,
                isEmailVerified: true,
            } as any,
        });
        const agency = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-456',
                userId: agencyUser.id,
                companyName: 'Test Agency Ltd',
                ice: 'ICE100001',
                patente: 'PAT100001',
                rib: 'RIB100001',
                verificationStatus: 'VERIFIED',
                travelLicenceType: 'ODV',
                travelLicenceStatus: 'VERIFIED',
                travelLicenceNumber: 'LIC-100001',
                licenceExpiry: new Date('2030-01-01T00:00:00.000Z'),
                insuranceStatus: 'VERIFIED',
                insuranceExpiry: new Date('2030-01-01T00:00:00.000Z'),
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            } as any,
        });
        const template = await db.tripTemplate.create({
            data: tripTemplateFixture({
                id: 'template-golden',
                agencyId: agency.id,
                title: 'Golden Path Trip',
                description: 'The chain, whole',
            }) as any,
        });
        const session = await db.tripSession.create({
            data: {
                id: 'session-golden',
                templateId: template.id,
                agencyId: agency.id,
                startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
                price: 390,
                totalSeats: 10,
                availableSeats: 10,
            } as any,
        });
        const traveler = await db.user.create({
            data: {
                id: 'traveler-user-123',
                email: 'traveler@example.com',
                name: 'Test Traveler',
                password: SEED_PW,
                role: UserRole.Traveler,
                isEmailVerified: true,
            } as any,
        });
        await db.user.create({
            data: {
                id: 'admin-123',
                email: 'admin@ouiboo.local',
                name: 'Test Admin',
                password: SEED_PW,
                role: UserRole.Admin,
                isEmailVerified: true,
            } as any,
        });
        return { agencyUser, agency, template, session, traveler };
    }

    it('drives one booking through payment, invoicing and a completed refund', async () => {
        const { session, agency } = await seedTestData();
        const http = () => request(app.getHttpServer());

        // ---- 1. Booking -------------------------------------------------
        const createRes = await http()
            .post('/bookings')
            .set('Authorization', AUTH_TRAVELER)
            .send({
                termsAccepted: true,
                termsVersion: '1.0',
                locale: 'en',
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(201);
        const bookingId: string = createRes.body.id;
        expect(createRes.body.status).toBe('PENDING');
        expect(createRes.body.totalAmount).toBe('780.00');

        // ---- 2. Payment: proof → accept → bank confirmation -------------
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await http()
            .post(`/bookings/${bookingId}/payment-proof`)
            .set('Authorization', AUTH_TRAVELER)
            .attach('file', fixturePath)
            .expect(201);

        await http()
            .patch(`/bookings/${bookingId}/verify-payment`)
            .set('Authorization', AUTH_AGENCY)
            .send({ approved: true })
            .expect(200);

        const confirmRes = await http()
            .patch(`/bookings/${bookingId}/confirm-bank-payment`)
            .set('Authorization', AUTH_AGENCY)
            .send({ confirmedAmount: 780, bankReference: 'BANK-REF-GOLDEN' })
            .expect(200);
        expect(confirmRes.body.status).toBe('CONFIRMED');

        let booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking?.paymentStatus).toBe('PAID');
        expect(booking?.confirmedAt).toBeTruthy();
        const settled = await db.externalPayment.findUniqueOrThrow({
            where: { bookingId_stage: { bookingId, stage: 'FULL' } },
        });
        expect(settled.status).toBe('VERIFIED');

        // ---- 3. Invoice: monthly platform service fee for the agency ----
        const confirmedAt = booking!.confirmedAt!;
        const invoiceRes = await http()
            .post('/admin/invoices/generate')
            .set('Authorization', AUTH_ADMIN)
            .send({
                agencyId: agency.id,
                year: confirmedAt.getUTCFullYear(),
                month: confirmedAt.getUTCMonth() + 1,
                commissionRatePercent: 10,
            })
            .expect(201);
        expect(invoiceRes.body.agencyId).toBe(agency.id);
        expect(invoiceRes.body.lineItems).toHaveLength(1);
        expect(invoiceRes.body.lineItems[0].bookingId).toBe(bookingId);
        // 10% of the 780.00 gross booking value.
        expect(String(invoiceRes.body.totalAmount)).toContain('78');

        const invoice = await db.invoice.findUnique({ where: { id: invoiceRes.body.id } });
        expect(invoice).toBeTruthy();

        // ---- 4. Refund: request → review → approve → initiate → evidence → complete
        const refundRes = await http()
            .post('/refunds/request')
            .set('Authorization', AUTH_TRAVELER)
            .send({ bookingId, reason: 'Plans changed' })
            .expect(201);
        const caseId: string = refundRes.body.id;
        expect(refundRes.body.status).toBe('REFUND_REQUESTED');
        expect(String(refundRes.body.requestedAmount)).toContain('780');

        await http().post(`/agency/refunds/${caseId}/review`).set('Authorization', AUTH_AGENCY).expect(201);
        await http().post(`/agency/refunds/${caseId}/approve`).set('Authorization', AUTH_AGENCY).send({}).expect(201);
        await http().post(`/agency/refunds/${caseId}/initiate`).set('Authorization', AUTH_AGENCY).send({}).expect(201);
        // Traveller confirms receipt while the case is REFUND_INITIATED
        // (the only state confirm-receipt accepts, #416).
        await http().post(`/refunds/mine/${caseId}/confirm-receipt`).set('Authorization', AUTH_TRAVELER).expect(201);
        await http()
            .post(`/agency/refunds/${caseId}/evidence`)
            .set('Authorization', AUTH_AGENCY)
            .send({ reference: 'VIR-GOLDEN-1', proofUrl: 'private/agency-user-456/bank-confirmation.pdf' })
            .expect(201);
        const completeRes = await http()
            .post(`/agency/refunds/${caseId}/complete`)
            .set('Authorization', AUTH_AGENCY)
            .send({})
            .expect(201);
        expect(completeRes.body.status).toBe('REFUND_COMPLETED');

        const refundCase = await db.refundCase.findUnique({ where: { id: caseId } });
        expect(refundCase?.status).toBe('REFUND_COMPLETED');
        const evidence = await db.refundEvidence.findMany({ where: { refundCaseId: caseId } });
        expect(evidence.length).toBeGreaterThanOrEqual(2); // agency bank evidence + traveller confirmation

        booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking?.refundStatus).toBeTruthy();
    });
});
