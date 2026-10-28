import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StagedPaymentsModule } from '../staged-payments/staged-payments.module';
import { CommonModule } from '../common/common.module';
import { ManualPspAdapter } from './adapters/manual-psp.adapter';
import { SandboxPspAdapter } from './adapters/sandbox-psp.adapter';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { PaymentProfilesService } from './payment-profiles.service';
import { PaymentRequestsService } from './payment-requests.service';
import { PaymentWebhooksService } from './webhooks.service';
import { PaymentReconciliationService } from './reconciliation.service';
import { PaymentProvidersController } from './payment-providers.controller';
import { AgencyPaymentProfileController } from './agency-payment-profile.controller';
import { AdminPaymentReconciliationController } from './admin-payment-reconciliation.controller';

/**
 * #373 — payment-provider orchestration: agency payment profiles under
 * the agency's own merchant identity, server-created payment requests,
 * signed webhooks into the #368 ledger, and reconciliation alerts.
 */
@Module({
    // RefundsModule: provider-confirmed refunds are wired into the
    // booking's RefundCase as tier-1 evidence (#416B). RefundsModule
    // does not import this module, so there is no cycle.
    imports: [DatabaseModule, ExternalPaymentsModule, StagedPaymentsModule, CommonModule, RefundsModule],
    providers: [
        ManualPspAdapter,
        SandboxPspAdapter,
        PspAdapterRegistry,
        PaymentProfilesService,
        PaymentRequestsService,
        PaymentWebhooksService,
        PaymentReconciliationService,
    ],
    controllers: [
        PaymentProvidersController,
        AgencyPaymentProfileController,
        AdminPaymentReconciliationController,
    ],
    exports: [PaymentReconciliationService, PaymentProfilesService],
})
export class PaymentProvidersModule { }
