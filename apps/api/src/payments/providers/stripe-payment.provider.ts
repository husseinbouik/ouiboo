import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentSession,
  PaymentVerificationResult,
  PaymentProvider,
} from '../interfaces/payment-provider.interface';
import Stripe from 'stripe';
import { MoneyInput, toMinorUnits } from '../../common/money.util';

/**
 * Stripe Payment Provider
 * Implements Stripe payment integration
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly publishableKey: string;
  private readonly callbackUrl: string;
  private readonly logger = new Logger(StripePaymentProvider.name);

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    this.callbackUrl = process.env.STRIPE_CALLBACK_URL || '';
  }

  async initiatePayment(
    amount: MoneyInput,
    bookingId: string,
    travelerEmail: string,
    travelerName: string,
  ): Promise<PaymentSession> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mad',
              product_data: {
                name: `Trip Booking - ${bookingId}`,
              },
              unit_amount: toMinorUnits(amount),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.callbackUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.callbackUrl}/payments/cancel`,
        customer_email: travelerEmail,
        metadata: {
          bookingId,
          travelerName,
        },
      });

      return {
        sessionId: session.id,
        redirectUrl: session.url || '',
        expiresAt: new Date(session.expires_at * 1000),
        metadata: { provider: 'STRIPE', sessionId: session.id },
      };
    } catch (error) {
      throw new Error(`Stripe payment initiation failed: ${error.message}`);
    }
  }

  async verifyPayment(
    transactionId: string,
    bookingId: string,
  ): Promise<PaymentVerificationResult> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(
        transactionId,
      );

      // #496: the provider session must belong to the booking being
      // verified. A paid session created for a different booking is a
      // failure for THIS booking — never a success.
      const sessionBookingId = session.metadata?.bookingId;
      if (!sessionBookingId || sessionBookingId !== bookingId) {
        return {
          status: 'failure',
          errorMessage: 'Payment session does not belong to this booking',
          bookingId: sessionBookingId ?? undefined,
          metadata: { ...session },
        };
      }

      if (session.payment_status === 'paid') {
        return {
          status: 'success',
          transactionId: session.payment_intent as string,
          bookingId: sessionBookingId,
          // Stripe reports the paid amount in minor units and the session
          // currency; surface both so the service can validate them
          // against the authoritative local transaction (#496).
          amount:
            session.amount_total != null
              ? (session.amount_total / 100).toFixed(2)
              : undefined,
          currency: session.currency ?? undefined,
          metadata: { ...session },
        };
      } else if (session.payment_status === 'unpaid') {
        return {
          status: 'pending',
          metadata: { ...session },
        };
      } else {
        return {
          status: 'failure',
          errorMessage: 'Payment failed or expired',
          metadata: { ...session },
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment verification failed';
      return {
        status: 'failure',
        errorMessage: message,
      };
    }
  }

  async processRefund(
    transactionId: string,
    amount: MoneyInput,
    idempotencyKey?: string,
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refund = await this.stripe.refunds.create(
        {
          payment_intent: transactionId,
          amount: toMinorUnits(amount),
        },
        // #497: deterministic key — a retry of the same refund claim
        // replays the same Stripe refund instead of creating a second one.
        idempotencyKey ? { idempotencyKey } : undefined,
      );

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refund failed';
      return {
        success: false,
        error: message,
      };
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return true;
    } catch {
      return false;
    }
  }
}
