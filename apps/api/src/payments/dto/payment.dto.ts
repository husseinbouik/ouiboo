import { IsNumber, IsString, IsEmail, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class InitiatePaymentDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  amount: number;

  @IsEmail()
  travelerEmail: string;

  @IsString()
  travelerName: string;

  @IsEnum(['CMI', 'STRIPE', 'PAYPAL'])
  provider: string;
}

export class VerifyPaymentDto {
  @IsString()
  transactionId: string;

  @IsString()
  bookingId: string;

  @IsEnum(['CMI', 'STRIPE', 'PAYPAL'])
  provider: string;
}

export class ProcessRefundDto {
  @IsString()
  transactionId: string;

  @IsNumber()
  amount: number;

  @IsEnum(['CMI', 'STRIPE', 'PAYPAL'])
  provider: string;
}
