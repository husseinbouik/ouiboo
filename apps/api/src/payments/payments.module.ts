import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { PaymentsService } from './payments.service';
import { GatewayEnablementService } from './gateway-enablement.service';
import { GatewayEnablementController } from './gateway-enablement.controller';
import { PaymentsController } from './payments.controller';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { CashPlusPaymentProvider } from './providers/cashplus-payment.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CommonModule, DatabaseModule, EmailModule, AuthModule, ExternalPaymentsModule, NotificationsModule],
  providers: [
    PaymentsService,
    // B3: CMIPaymentProvider is deliberately NOT registered — it is a
    // locked stub (parked decision #362) and must not be injectable.
    // Selection via PaymentProviderFactory throws explicitly instead.
    StripePaymentProvider,
    CashPlusPaymentProvider,
    PaymentProviderFactory,
    GatewayEnablementService,
  ],
  controllers: [PaymentsController, GatewayEnablementController],
  exports: [PaymentsService, GatewayEnablementService],
})
export class PaymentsModule {}
