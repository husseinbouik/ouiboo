import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CMIPaymentProvider } from './providers/cmi-payment.provider';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { CashPlusPaymentProvider } from './providers/cashplus-payment.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

@Module({
  imports: [DatabaseModule, EmailModule],
  providers: [
    PaymentsService,
    CMIPaymentProvider,
    StripePaymentProvider,
    CashPlusPaymentProvider,
    PaymentProviderFactory,
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
