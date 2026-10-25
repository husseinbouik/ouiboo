import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';

/**
 * #422 (Council P0-20): admin proof review is proof-accept only. These
 * specs pin the split: an admin VERIFIED decision accepts the proof
 * image and settles nothing (settlement is the agency's bank
 * confirmation, which deliberately has no admin override); rejection
 * stays one-step.
 */
describe('AdminController.verifyPayment (#422)', () => {
    const req = { user: { userId: 'admin-1', email: 'admin@ouiboo.local' } };

    function makeProof(overrides: Record<string, any> = {}): any {
        return {
            id: 'proof-1',
            status: 'PENDING',
            bookingId: 'booking-1',
            booking: {
                id: 'booking-1',
                status: 'AWAITING_VALIDATION',
                totalAmount: 780,
                currency: 'MAD',
                paymentMethod: 'MANUAL',
                travelerId: 'traveler-1',
                traveler: { email: 'traveler@example.com' },
                session: { template: { agencyId: 'agency-1', title: 'Atlas Escape' } },
                paymentPlan: null,
            },
            ...overrides,
        };
    }

    function makeController(proof: any) {
        const db: any = {
            paymentProof: {
                findUnique: jest.fn(async () => proof),
                update: jest.fn(async ({ data }: any) => ({ id: 'proof-1', ...data })),
            },
            booking: {
                update: jest.fn(async () => ({
                    id: 'booking-1',
                    totalAmount: 780,
                    currency: 'MAD',
                    paymentMethod: 'MANUAL',
                    session: { template: { agencyId: 'agency-1', title: 'Atlas Escape' } },
                })),
            },
            $transaction: jest.fn(async (cb: any) => cb(db)),
        };
        const external = {
            recordPaymentVerifiedInTransaction: jest.fn(async () => ({})),
            recordPaymentRejectedInTransaction: jest.fn(async () => ({})),
        };
        const staged = {
            applyProofRejectionInTransaction: jest.fn(async () => ({ fullyPaid: false })),
            applyBankConfirmationInTransaction: jest.fn(async () => ({ fullyPaid: false })),
        };
        const email = { sendPaymentConfirmation: jest.fn(async () => true) };
        const audit = { log: jest.fn(async () => null) };
        const payments = { refundBookingById: jest.fn() };
        const controller = new AdminController(
            db as any, external as any, staged as any, email as any, audit as any, payments as any,
        );
        return { controller, db, external, staged, email, audit };
    }

    it('a VERIFIED decision only ACCEPTS the proof: no settlement, no booking change, no email', async () => {
        const { controller, db, external, email, audit } = makeController(makeProof());

        const result: any = await controller.verifyPayment(req, 'proof-1', 'VERIFIED');

        expect(result.status).toBe('ACCEPTED');
        expect(db.paymentProof.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'ACCEPTED' }),
        }));
        expect(external.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        expect(db.booking.update).not.toHaveBeenCalled();
        expect(email.sendPaymentConfirmation).not.toHaveBeenCalled();
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_PROOF_ACCEPTED' }));
    });

    it('accepting a staged proof calls no staged payment effects either', async () => {
        const proof = makeProof();
        proof.booking.paymentPlan = { id: 'plan-1', status: 'DEPOSIT_DUE' };
        const { controller, staged, external } = makeController(proof);

        const result: any = await controller.verifyPayment(req, 'proof-1', 'VERIFIED');

        expect(result.status).toBe('ACCEPTED');
        expect(staged.applyProofRejectionInTransaction).not.toHaveBeenCalled();
        expect(staged.applyBankConfirmationInTransaction).not.toHaveBeenCalled();
        expect(external.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
    });

    it('rejecting a non-staged proof fails the booking and records the rejection', async () => {
        const { controller, db, external, audit } = makeController(makeProof());

        const result: any = await controller.verifyPayment(req, 'proof-1', 'REJECTED', 'Illegible screenshot');

        expect(result.status).toBe('REJECTED');
        expect(db.booking.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'REJECTED', paymentStatus: 'FAILED' }),
        }));
        expect(external.recordPaymentRejectedInTransaction).toHaveBeenCalledTimes(1);
        expect(external.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_PROOF_REJECTED' }));
    });

    it('rejecting a staged proof delegates to applyProofRejectionInTransaction', async () => {
        const proof = makeProof();
        proof.booking.paymentPlan = { id: 'plan-1', status: 'DEPOSIT_DUE' };
        const { controller, db, staged } = makeController(proof);

        await controller.verifyPayment(req, 'proof-1', 'REJECTED', 'Wrong amount');

        expect(staged.applyProofRejectionInTransaction).toHaveBeenCalledTimes(1);
        const args = (staged.applyProofRejectionInTransaction.mock.calls[0] as any)[1];
        expect(args.source).toBe('ADMIN_PROOF_REVIEW');
        expect(db.booking.update).not.toHaveBeenCalled();
    });

    it('rejects invalid statuses and reason-less rejections', async () => {
        const { controller } = makeController(makeProof());
        await expect(controller.verifyPayment(req, 'proof-1', 'MAYBE' as any)).rejects.toThrow(BadRequestException);
        await expect(controller.verifyPayment(req, 'proof-1', 'REJECTED')).rejects.toThrow('Rejection reason is required');
    });

    it('refuses to review a missing, already-reviewed, or non-awaiting proof', async () => {
        const missing = makeController(null);
        await expect(missing.controller.verifyPayment(req, 'proof-x', 'VERIFIED')).rejects.toThrow('Payment proof not found');

        const reviewed = makeController(makeProof({ status: 'ACCEPTED' }));
        await expect(reviewed.controller.verifyPayment(req, 'proof-1', 'VERIFIED')).rejects.toThrow('already been reviewed');

        const settled = makeProof();
        settled.booking.status = 'CONFIRMED';
        const notAwaiting = makeController(settled);
        await expect(notAwaiting.controller.verifyPayment(req, 'proof-1', 'VERIFIED')).rejects.toThrow('not awaiting payment validation');
    });
});
