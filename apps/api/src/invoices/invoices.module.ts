import { Module } from '@nestjs/common';
import { AgencyInvoicesController } from './agency-invoices.controller';
import { AdminInvoicesController } from './admin-invoices.controller';
import { BillingConfigController } from './billing-config.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
    controllers: [AgencyInvoicesController, AdminInvoicesController, BillingConfigController],
    providers: [InvoicesService, InvoicePdfService],
})
export class InvoicesModule { }
