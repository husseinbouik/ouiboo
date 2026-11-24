import { IsString, IsEmail, IsEnum } from 'class-validator';
import { IsDecimalMoney } from '../../common/validators/is-decimal-money.decorator';
import { type MoneyInput } from '../../common/money.util';

export enum PaymentProviderDto {
  // B3: 'CMI' is deliberately absent — the CMI provider is a locked
  // stub (parked decision #362), so the API boundary rejects it with a
  // validation error instead of letting it reach the provider factory.
  STRIPE = 'STRIPE',
  CASHPLUS = 'CASHPLUS',
}

export class InitiatePaymentDto {
  @IsString()
  bookingId!: string;

  @IsDecimalMoney()
  amount!: MoneyInput;

  @IsEmail()
  travelerEmail!: string;

  @IsString()
  travelerName!: string;

  @IsEnum(PaymentProviderDto)
  provider!: string;
}

export class VerifyPaymentDto {
  @IsString()
  transactionId!: string;

  @IsString()
  bookingId!: string;

  @IsEnum(PaymentProviderDto)
  provider!: string;
}

export class ProcessRefundDto {
  @IsString()
  bookingId!: string;

  @IsString()
  transactionId!: string;

  @IsDecimalMoney()
  amount!: MoneyInput;

  @IsEnum(PaymentProviderDto)
  provider!: string;
}
