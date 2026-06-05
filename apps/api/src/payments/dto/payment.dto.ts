import { IsString, IsEmail, IsEnum } from 'class-validator';
import { IsDecimalMoney } from '../../common/validators/is-decimal-money.decorator';

export enum PaymentProviderDto {
  CMI = 'CMI',
  STRIPE = 'STRIPE',
  CASHPLUS = 'CASHPLUS',
}

export class InitiatePaymentDto {
  @IsString()
  bookingId: string;

  @IsDecimalMoney()
  amount: string | number;

  @IsEmail()
  travelerEmail: string;

  @IsString()
  travelerName: string;

  @IsEnum(PaymentProviderDto)
  provider: string;
}

export class VerifyPaymentDto {
  @IsString()
  transactionId: string;

  @IsString()
  bookingId: string;

  @IsEnum(PaymentProviderDto)
  provider: string;
}

export class ProcessRefundDto {
  @IsString()
  bookingId: string;

  @IsString()
  transactionId: string;

  @IsDecimalMoney()
  amount: string | number;

  @IsEnum(PaymentProviderDto)
  provider: string;
}
