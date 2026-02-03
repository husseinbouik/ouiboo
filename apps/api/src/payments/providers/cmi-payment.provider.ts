import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentSession,
  PaymentVerificationResult,
  PaymentProvider,
} from '../interfaces/payment-provider.interface';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * CMI Payment Gateway Provider
 * Implements CMI (Crédit Mutuel Irland) payment integration for Morocco
 */
@Injectable()
export class CMIPaymentProvider implements PaymentProvider {
  private merchantId: string;
  private apiKey: string;
  private baseUrl: string;
  private callbackUrl: string;
  private http: AxiosInstance;
  private readonly logger = new Logger(CMIPaymentProvider.name);

  constructor() {
    this.merchantId = process.env.CMI_MERCHANT_ID || '';
    this.apiKey = process.env.CMI_API_KEY || '';
    this.baseUrl = process.env.CMI_BASE_URL || 'https://api.cmipay.com';
    this.callbackUrl = process.env.CMI_CALLBACK_URL || '';
    this.http = axios.create({ baseURL: this.baseUrl, timeout: 10000 });
  }

  async initiatePayment(
    amount: number,
    bookingId: string,
    travelerEmail: string,
    travelerName: string,
  ): Promise<PaymentSession> {
    try {
      // Implementation for CMI payment initiation
      // This would call the CMI API to create a payment session
      const paymentData = {
        merchantId: this.merchantId,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'MAD',
        orderId: bookingId,
        description: `Trip Booking - ${bookingId}`,
        customerEmail: travelerEmail,
        customerName: travelerName,
        returnUrl: `${this.callbackUrl}/payments/callback`,
        cancelUrl: `${this.callbackUrl}/payments/cancel`,
        notifyUrl: `${this.callbackUrl}/payments/webhook`,
      };

      // TODO: Implement actual CMI API call
      const response = await this.callCMIAPI('/payments/initiate', paymentData);

      return {
        sessionId: response.sessionId,
        redirectUrl: response.redirectUrl,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        metadata: { provider: 'CMI', ...response },
      };
    } catch (error) {
      throw new Error(`CMI payment initiation failed: ${error.message}`);
    }
  }

  async verifyPayment(
    transactionId: string,
    bookingId: string,
  ): Promise<PaymentVerificationResult> {
    try {
      // TODO: Implement actual CMI API call to verify payment
      const response = await this.callCMIAPI('/payments/verify', {
        transactionId,
        orderId: bookingId,
        merchantId: this.merchantId,
      });

      if (response.status === 'SUCCESS') {
        return {
          status: 'success',
          transactionId: response.transactionId,
          metadata: response,
        };
      } else if (response.status === 'PENDING') {
        return {
          status: 'pending',
          metadata: response,
        };
      } else {
        return {
          status: 'failure',
          errorMessage: response.errorMessage || 'Payment verification failed',
          metadata: response,
        };
      }
    } catch (error) {
      return {
        status: 'failure',
        errorMessage: error.message,
      };
    }
  }

  async processRefund(
    transactionId: string,
    amount: number,
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      // TODO: Implement actual CMI API call for refund
      const response = await this.callCMIAPI('/payments/refund', {
        transactionId,
        amount: Math.round(amount * 100),
        merchantId: this.merchantId,
      });

      return {
        success: response.status === 'SUCCESS',
        refundId: response.refundId,
        error: response.errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    // TODO: Implement CMI webhook signature validation
    // Typically involves HMAC-SHA256 signing with the API key
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.apiKey)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  private async callCMIAPI(endpoint: string, data: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      // Build payload and signature (HMAC-SHA256 of payload using apiKey)
      const payload = typeof data === 'string' ? data : JSON.stringify(data || {});
      const signature = this.apiKey
        ? crypto.createHmac('sha256', this.apiKey).update(payload).digest('hex')
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.merchantId) headers['X-Merchant-Id'] = this.merchantId;
      if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
      if (signature) headers['X-Signature'] = signature;

      this.logger.debug(`Calling CMI ${url}`);

      const res = await this.http.post(endpoint, data, { headers });

      if (!res || !res.data) {
        throw new Error('Empty response from CMI');
      }

      const body = res.data;

      return body;
    } catch (err: any) {
      this.logger.error('CMI API error', err?.message || err);
      throw err;
    }
  }
}
