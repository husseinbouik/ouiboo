import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentSession,
  PaymentVerificationResult,
  PaymentProvider,
} from '../interfaces/payment-provider.interface';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { MoneyInput, toMinorUnits } from '../../common/money.util';

/**
 * CashPlus Payment Provider
 * Minimal implementation mirroring CMI provider shape
 */
@Injectable()
export class CashPlusPaymentProvider implements PaymentProvider {
  private merchantId: string;
  private apiKey: string;
  private baseUrl: string;
  private callbackUrl: string;
  private http: AxiosInstance;
  private readonly logger = new Logger(CashPlusPaymentProvider.name);

  constructor() {
    this.merchantId = process.env.CASHPLUS_MERCHANT_ID || '';
    this.apiKey = process.env.CASHPLUS_API_KEY || '';
    this.baseUrl = process.env.CASHPLUS_BASE_URL || 'https://api.cashplus.ma';
    this.callbackUrl = process.env.CASHPLUS_CALLBACK_URL || '';
    this.http = axios.create({ baseURL: this.baseUrl, timeout: 10000 });
  }

  async initiatePayment(
    amount: MoneyInput,
    bookingId: string,
    travelerEmail: string,
    travelerName: string,
  ): Promise<PaymentSession> {
    try {
      const payload = {
        merchantId: this.merchantId,
        amount: toMinorUnits(amount),
        currency: 'MAD',
        orderId: bookingId,
        customerEmail: travelerEmail,
        customerName: travelerName,
        returnUrl: this.buildTravelerReturnUrl('success', bookingId, bookingId),
        cancelUrl: this.buildTravelerReturnUrl('cancelled', bookingId, bookingId),
        notifyUrl: `${this.getApiCallbackBaseUrl()}/payments/webhook/cashplus`,
      };

      const res = await this.callCashPlusAPI('/v1/payments/initiate', payload);

      return {
        sessionId: res.sessionId || res.transactionId || '',
        redirectUrl: res.redirectUrl || res.paymentUrl || '',
        expiresAt: res.expiresAt ? new Date(res.expiresAt) : new Date(Date.now() + 30 * 60 * 1000),
        metadata: { provider: 'CASHPLUS', ...res },
      };
    } catch (err: any) {
      throw new Error(`CashPlus payment initiation failed: ${err.message || err}`);
    }
  }

  async verifyPayment(
    transactionId: string,
    bookingId: string,
  ): Promise<PaymentVerificationResult> {
    try {
      const res = await this.callCashPlusAPI('/v1/payments/verify', {
        transactionId,
        orderId: bookingId,
        merchantId: this.merchantId,
      });

      if (res.status === 'SUCCESS' || res.status === 'PAID') {
        return {
          status: 'success',
          transactionId: res.transactionId || transactionId,
          metadata: res,
        };
      } else if (res.status === 'PENDING') {
        return { status: 'pending', metadata: res };
      } else {
        return { status: 'failure', errorMessage: res.errorMessage || 'Payment failed', metadata: res };
      }
    } catch (err: any) {
      return { status: 'failure', errorMessage: err.message };
    }
  }

  async processRefund(
    transactionId: string,
    amount: MoneyInput,
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const res = await this.callCashPlusAPI('/v1/payments/refund', {
        transactionId,
        amount: toMinorUnits(amount),
        merchantId: this.merchantId,
      });

      return { success: res.status === 'SUCCESS', refundId: res.refundId, error: res.errorMessage };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expected = this.apiKey ? crypto.createHmac('sha256', this.apiKey).update(payload).digest('hex') : '';
      return expected === signature;
    } catch {
      return false;
    }
  }

  private async callCashPlusAPI(endpoint: string, data: any): Promise<any> {
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data || {});
      const signature = this.apiKey ? crypto.createHmac('sha256', this.apiKey).update(payload).digest('hex') : '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.merchantId) headers['X-Merchant-Id'] = this.merchantId;
      if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
      if (signature) headers['X-Signature'] = signature;

      this.logger.debug(`Calling CashPlus ${this.baseUrl}${endpoint}`);

      const res = await this.http.post(endpoint, data, { headers });
      if (!res || !res.data) throw new Error('Empty response from CashPlus');
      return res.data;
    } catch (err: any) {
      this.logger.error('CashPlus API error', err?.message || err);
      throw err;
    }
  }

  private buildTravelerReturnUrl(status: 'success' | 'cancelled', bookingId: string, transactionId: string) {
    const fallbackBaseUrl = process.env.TRAVELER_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
    const returnBaseUrl = this.callbackUrl || `${fallbackBaseUrl.replace(/\/$/, '')}/checkout/confirmation`;
    const separator = returnBaseUrl.includes('?') ? '&' : '?';
    return `${returnBaseUrl}${separator}bookingId=${encodeURIComponent(bookingId)}&provider=CASHPLUS&transactionId=${encodeURIComponent(transactionId)}&gatewayStatus=${status}`;
  }

  private getApiCallbackBaseUrl() {
    return (this.callbackUrl || process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
  }
}
