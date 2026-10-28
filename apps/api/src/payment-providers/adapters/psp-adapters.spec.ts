import { ManualPspAdapter } from './manual-psp.adapter';
import { SandboxPspAdapter } from './sandbox-psp.adapter';
import { resolveWebhookSecret } from './psp-adapter.registry';
import * as crypto from 'node:crypto';

describe('SandboxPspAdapter signature validation (#373, plan §49)', () => {
    const adapter = new SandboxPspAdapter({} as any);
    const secret = 'sandbox-secret';
    const body = JSON.stringify({ id: 'evt-1', type: 'payment.captured', data: { paymentId: 'sandbox_x' } });

    it('accepts a correct HMAC-SHA256 signature', () => {
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
        expect(adapter.verifyWebhookSignature(body, signature, secret)).toBe(true);
    });

    it('rejects a signature made with the wrong secret', () => {
        const signature = crypto.createHmac('sha256', 'wrong').update(body).digest('hex');
        expect(adapter.verifyWebhookSignature(body, signature, secret)).toBe(false);
    });

    it('rejects a tampered body', () => {
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
        expect(adapter.verifyWebhookSignature(body.replace('captured', 'failed'), signature, secret)).toBe(false);
    });

    it('fails closed when no secret is configured or no signature is sent', () => {
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
        expect(adapter.verifyWebhookSignature(body, signature, null)).toBe(false);
        expect(adapter.verifyWebhookSignature(body, undefined, secret)).toBe(false);
    });

    it('parses the documented event envelope', () => {
        const event = adapter.parseWebhookEvent({
            id: 'evt-9',
            type: 'payment.captured',
            timestamp: 1_760_000_000,
            data: {
                paymentId: 'sandbox_p1',
                bookingId: 'booking-1',
                merchantId: 'merchant-1',
                amount: '500.00',
                currency: 'MAD',
                transactionId: 'txn-1',
            },
        });
        expect(event).toMatchObject({
            providerEventId: 'evt-9',
            providerPaymentId: 'sandbox_p1',
            bookingId: 'booking-1',
            merchantId: 'merchant-1',
            amount: '500.00',
            status: 'captured',
            transactionId: 'txn-1',
        });
        expect(event.occurredAt).toEqual(new Date(1_760_000_000 * 1000));
    });

    it('rejects malformed events', () => {
        expect(() => adapter.parseWebhookEvent({ id: 'x' })).toThrow();
        expect(() => adapter.parseWebhookEvent(null)).toThrow();
    });
});

describe('ManualPspAdapter (#373, plan §57)', () => {
    const adapter = new ManualPspAdapter({
        agencyProfile: {
            findUnique: async () => ({
                bankDetails: 'RIB 123 — Attijariwafa',
                // #421: instructions are served only for a verified destination.
                bankDetailsStatus: 'VERIFIED',
                bankDetailsVerifiedAt: new Date('2026-10-20T00:00:00Z'),
            }),
        },
    } as any);

    it('never validates a webhook signature: the manual flow has no webhooks', () => {
        expect(adapter.verifyWebhookSignature('{}', 'anything', 'secret')).toBe(false);
        expect(adapter.verifyWebhookSignature('{}', undefined, null)).toBe(false);
    });

    it('creates a payment request from the agency bank instructions', async () => {
        const result = await adapter.createPaymentRequest(
            { agencyId: 'agency-1', externalMerchantId: 'agency-1', currency: 'MAD' },
            { bookingId: 'b1', stage: 'FULL' as any, amount: 100, currency: 'MAD', idempotencyKey: 'k' },
        );
        expect(result.providerPaymentId).toBeNull();
        expect(result.hostedUrl).toBeNull();
        expect(result.instructions).toContain('RIB 123');
    });

    it('returns no instructions while the destination is unverified (#421)', async () => {
        const unverified = new ManualPspAdapter({
            agencyProfile: {
                findUnique: async () => ({
                    bankDetails: 'RIB 999 — Unverified',
                    bankDetailsStatus: 'PENDING_REVIEW',
                    bankDetailsVerifiedAt: null,
                }),
            },
        } as any);
        const result = await unverified.createPaymentRequest(
            { agencyId: 'agency-2', externalMerchantId: 'agency-2', currency: 'MAD' },
            { bookingId: 'b2', stage: 'FULL' as any, amount: 100, currency: 'MAD', idempotencyKey: 'k2' },
        );
        expect(result.instructions).toBeNull();
    });

    it('refunds are executed by the agency through its own channel', async () => {
        const result = await adapter.requestRefund(
            { agencyId: 'agency-1', externalMerchantId: 'agency-1', currency: 'MAD' },
            { providerPaymentId: null, amount: 100, currency: 'MAD' },
        );
        expect(result.mode).toBe('manual');
    });
});

describe('resolveWebhookSecret (#373)', () => {
    const OLD = process.env;
    beforeEach(() => { process.env = { ...OLD }; });
    afterAll(() => { process.env = OLD; });

    it('resolves the profile ref, falling back to the provider-level variable', () => {
        process.env.CUSTOM_REF = 'from-ref';
        process.env.PSP_SANDBOX_WEBHOOK_SECRET = 'from-provider';
        expect(resolveWebhookSecret('sandbox', 'CUSTOM_REF')).toBe('from-ref');
        expect(resolveWebhookSecret('sandbox', null)).toBe('from-provider');
        expect(resolveWebhookSecret('sandbox', undefined)).toBe('from-provider');
    });

    it('returns null when nothing is configured (callers fail closed)', () => {
        delete process.env.PSP_SANDBOX_WEBHOOK_SECRET;
        expect(resolveWebhookSecret('sandbox', null)).toBeNull();
        expect(resolveWebhookSecret('sandbox', 'NOT_A_REAL_ENV_NAME')).toBeNull();
    });

    it('rejects refs that are not environment variable names', () => {
        expect(resolveWebhookSecret('sandbox', 'a/b; rm -rf')).toBeNull();
    });
});
