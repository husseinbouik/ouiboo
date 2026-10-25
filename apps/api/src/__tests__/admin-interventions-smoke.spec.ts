import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AdminInterventionsController } from '../admin/admin-interventions.controller';
import { AdminInterventionsService } from '../admin/admin-interventions.service';
import { AdminRefundsController } from '../refunds/admin-refunds.controller';
import { RefundsService } from '../refunds/refunds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Council P0-21 — route smoke test for the admin interventions API.
 *
 * Complements admin-audit-smoke.spec.ts: it mounts the controllers with the
 * services mocked out and the auth/role guards bypassed (both guards are
 * covered by their own specs and by the 401/403 matrices in
 * admin-audit-smoke). It asserts the intervention routes exist, delegate to
 * the services with the authenticated admin as the audit actor, and pass the
 * mandatory reason through untouched.
 */
const JWT_USER = { userId: 'admin-1', email: 'admin@ouiboo.test', role: 'ADMIN' };
const ACTOR = { id: 'admin-1', email: 'admin@ouiboo.test' };
const REASON = 'Traveler reported the group stuck';

describe('Admin interventions API routes (Council P0-21)', () => {
    let app: INestApplication;
    const interventions = {
        listPendingGroups: jest.fn(async () => ({ data: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } })),
        forceConfirmGroup: jest.fn(async () => ({ sessionId: 's1', changed: true })),
        closeGroup: jest.fn(async () => ({ sessionId: 's1', changed: true })),
        extendDeadline: jest.fn(async () => ({ sessionId: 's1', changed: true })),
        repairBooking: jest.fn(async () => ({ bookingId: 'b1', changed: true })),
    };
    const refunds = {
        repairCaseAsAdmin: jest.fn(async () => ({ refundCaseId: 'rc1', changed: true })),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AdminInterventionsController, AdminRefundsController],
            providers: [
                { provide: AdminInterventionsService, useValue: interventions },
                { provide: RefundsService, useValue: refunds },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    context.switchToHttp().getRequest().user = JWT_USER;
                    return true;
                },
            })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => jest.clearAllMocks());

    it('GET /admin/groups/pending lists stuck groups', async () => {
        const res = await request(app.getHttpServer()).get('/admin/groups/pending').expect(200);
        expect(res.body.pagination.total).toBe(0);
        expect(interventions.listPendingGroups).toHaveBeenCalledTimes(1);
    });

    it('POST /admin/sessions/:id/force-confirm-group passes actor and reason to the service', async () => {
        await request(app.getHttpServer())
            .post('/admin/sessions/session-1/force-confirm-group')
            .send({ reason: REASON })
            .expect(201);
        expect(interventions.forceConfirmGroup).toHaveBeenCalledWith(ACTOR, 'session-1', REASON);
    });

    it('POST /admin/sessions/:id/close-group passes actor and reason to the service', async () => {
        await request(app.getHttpServer())
            .post('/admin/sessions/session-1/close-group')
            .send({ reason: REASON })
            .expect(201);
        expect(interventions.closeGroup).toHaveBeenCalledWith(ACTOR, 'session-1', REASON);
    });

    it('POST /admin/sessions/:id/extend-deadline passes the new deadline through', async () => {
        await request(app.getHttpServer())
            .post('/admin/sessions/session-1/extend-deadline')
            .send({ reason: REASON, newDeadline: '2027-03-05T09:00:00.000Z' })
            .expect(201);
        expect(interventions.extendDeadline).toHaveBeenCalledWith(
            ACTOR,
            'session-1',
            '2027-03-05T09:00:00.000Z',
            REASON,
        );
    });

    it('POST /admin/bookings/:id/repair runs a named repair', async () => {
        await request(app.getHttpServer())
            .post('/admin/bookings/booking-1/repair')
            .send({ action: 'resync-payment-state', reason: REASON })
            .expect(201);
        expect(interventions.repairBooking).toHaveBeenCalledWith(
            ACTOR,
            'booking-1',
            'resync-payment-state',
            REASON,
        );
    });

    it('POST /admin/refunds/:id/repair delegates to the admin-only repair path', async () => {
        await request(app.getHttpServer())
            .post('/admin/refunds/rc-1/repair')
            .send({ action: 'reopen', reason: REASON })
            .expect(201);
        expect(refunds.repairCaseAsAdmin).toHaveBeenCalledWith(ACTOR, 'rc-1', {
            action: 'reopen',
            reason: REASON,
        });
    });
});
