import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  InitiatePaymentDto,
  PaymentProviderDto,
  VerifyPaymentDto,
  ProcessRefundDto,
} from './payment.dto';

/**
 * B3 — 'CMI' must stay out of the provider enum accepted at the API
 * boundary (locked stub, parked decision #362), while the real
 * providers keep validating.
 */
describe('Payment DTOs — CMI excluded (B3)', () => {
  it('PaymentProviderDto has no CMI member', () => {
    expect(Object.values(PaymentProviderDto)).not.toContain('CMI');
    expect(Object.values(PaymentProviderDto)).toEqual(
      expect.arrayContaining(['STRIPE', 'CASHPLUS']),
    );
  });

  it('InitiatePaymentDto rejects provider=CMI', async () => {
    const dto = plainToInstance(InitiatePaymentDto, {
      bookingId: 'booking-1',
      amount: '100.00',
      travelerEmail: 'a@b.c',
      travelerName: 'A',
      provider: 'CMI',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'provider')).toBe(true);
  });

  it('VerifyPaymentDto rejects provider=CMI', async () => {
    const dto = plainToInstance(VerifyPaymentDto, {
      transactionId: 'tx-1',
      bookingId: 'booking-1',
      provider: 'CMI',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'provider')).toBe(true);
  });

  it('ProcessRefundDto rejects provider=CMI', async () => {
    const dto = plainToInstance(ProcessRefundDto, {
      bookingId: 'booking-1',
      transactionId: 'tx-1',
      amount: '10.00',
      provider: 'CMI',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'provider')).toBe(true);
  });

  it('InitiatePaymentDto still accepts CASHPLUS', async () => {
    const dto = plainToInstance(InitiatePaymentDto, {
      bookingId: 'booking-1',
      amount: '100.00',
      travelerEmail: 'a@b.c',
      travelerName: 'A',
      provider: 'CASHPLUS',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'provider')).toBe(false);
  });
});
