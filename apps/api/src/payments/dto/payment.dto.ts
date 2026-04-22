import { IsNumber, IsString, IsEmail, IsEnum } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  amount: number;

  @IsEmail()
  travelerEmail: string;

  @IsString()
  travelerName: string;

  @IsEnum(['CMI', 'STRIPE', 'CASHPLUS'])
  provider: string;
}

export class VerifyPaymentDto {
  @IsString()
  transactionId: string;

  @IsString()
  bookingId: string;

  @IsEnum(['CMI', 'STRIPE', 'CASHPLUS'])
  provider: string;
}

export class ProcessRefundDto {
  @IsString()
  bookingId: string;

  @IsString()
  transactionId: string;

  @IsNumber()
  amount: number;

  @IsEnum(['CMI', 'STRIPE', 'CASHPLUS'])
  provider: string;
}
