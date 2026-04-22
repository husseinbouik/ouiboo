import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentSession,
  PaymentVerificationResult,
  PaymentProvider,
} from '../interfaces/payment-provider.interface';
import Stripe from 'stripe';

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
    amount: number,
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
              unit_amount: Math.round(amount * 100),
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
    _bookingId: string,
  ): Promise<PaymentVerificationResult> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(
        transactionId,
      );

      if (session.payment_status === 'paid') {
        return {
          status: 'success',
          transactionId: session.payment_intent as string,
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
    amount: number,
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100),
      });

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
