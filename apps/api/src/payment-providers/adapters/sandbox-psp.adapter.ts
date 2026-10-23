import { Injectable } from '@nestjs/common';
import { PaymentCustodian } from '@ouiboo/database';
import * as crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { toMoneyDecimal, toMoneyString } from '../../common/money.util';
import {
    PspAdapter,
    PspCreatePaymentRequestInput,
    PspCreatePaymentRequestResult,
    PspEventStatus,
    PspProfileContext,
    PspRefundResult,
    PspRemoteStatus,
    PspWebhookEvent,
} from './psp-adapter.interface';

/**
 * #373 — sandbox PSP adapter. A self-contained test provider used to
 * exercise the hosted-page + signed-webhook path end to end without a
 * real payment institution (the real partner comes from the Phase 3
 * RFP). It moves NO money: the "hosted page" is a reserved .test URL and
 * its webhooks are HMAC-SHA256-signed events in the documented envelope:
 *
 *   POST /payments/webhooks/sandbox
 *   Header: x-psp-signature: hex(hmac_sha256(rawBody, webhookSecret))
 *   Body: {
 *     "id": "<provider event id>",
 *     "type": "payment.captured" | "payment.failed" | "payment.refunded",
 *     "timestamp": <unix seconds>,
 *     "data": {
 *       "paymentId": "sandbox_...", "bookingId": "...",
 *       "merchantId": "<agency merchant id>", "amount": "500.00",
 *       "currency": "MAD", "transactionId": "..."
 *     }
 *   }
 */
@Injectable()
export class SandboxPspAdapter implements PspAdapter {
    readonly providerKey = 'sandbox';
    readonly custodian = PaymentCustodian.AGENCY_PSP;

    constructor(private db: DatabaseService) { }

    async createPaymentRequest(
        _profile: PspProfileContext,
        input: PspCreatePaymentRequestInput,
    ): Promise<PspCreatePaymentRequestResult> {
        const providerPaymentId = `sandbox_${crypto.randomUUID()}`;
        return {
            providerPaymentId,
            hostedUrl: `https://sandbox-pay.example.test/checkout/${providerPaymentId}`,
            instructions: null,
        };
    }

    verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string | null): boolean {
        if (!secret || !signature) {
            return false;
        }
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        const given = Buffer.from(signature, 'utf8');
        const wanted = Buffer.from(expected, 'utf8');
        return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
    }

    parseWebhookEvent(payload: any): PspWebhookEvent {
        const data = payload?.data ?? {};
        const statusByType: Record<string, PspEventStatus> = {
            'payment.captured': 'captured',
            'payment.failed': 'failed',
            'payment.refunded': 'refunded',
        };
        const status = statusByType[payload?.type];
        if (!payload?.id || !status || !data.paymentId || !data.merchantId || data.amount === undefined) {
            throw new Error('Malformed sandbox webhook event');
        }
        return {
            providerEventId: String(payload.id),
            eventType: String(payload.type),
            providerPaymentId: String(data.paymentId),
            bookingId: data.bookingId ? String(data.bookingId) : null,
            merchantId: String(data.merchantId),
            amount: toMoneyString(toMoneyDecimal(data.amount, 'amount')) || '0.00',
            currency: String(data.currency || 'MAD'),
            status,
            transactionId: data.transactionId ? String(data.transactionId) : null,
            occurredAt: typeof payload.timestamp === 'number'
                ? new Date(payload.timestamp * 1000)
                : null,
        };
    }

    async requestRefund(
        _profile: PspProfileContext,
        _input: { providerPaymentId: string | null },
    ): Promise<PspRefundResult> {
        return { providerRefundId: `sandbox_refund_${crypto.randomUUID()}`, mode: 'executed' };
    }

    async fetchPaymentStatus(
        profile: PspProfileContext,
        attempt: { providerPaymentId: string | null },
    ): Promise<PspRemoteStatus> {
        // The sandbox provider's own record of a payment is the latest
        // webhook event it emitted for it (stored in the webhook inbox).
        const entries = await this.db.webhookInboxEntry.findMany({
            where: { provider: this.providerKey, signatureValidated: true },
            orderBy: { receivedAt: 'desc' },
            take: 200,
            select: { payload: true, processingStatus: true },
        });
        const match = entries.find((entry) => {
            const data: any = (entry.payload as any)?.data;
            return data?.paymentId === attempt.providerPaymentId;
        });
        if (!match) {
            return {
                status: 'pending',
                amount: '0.00',
                currency: profile.currency,
                merchantId: profile.externalMerchantId,
            };
        }
        const event = this.parseWebhookEvent(match.payload);
        return {
            status: event.status,
            amount: event.amount,
            currency: event.currency,
            merchantId: event.merchantId,
        };
    }
}
