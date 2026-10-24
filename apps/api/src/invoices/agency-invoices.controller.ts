import { Controller, Get, Param, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';

@ApiTags('AgencyInvoices')
@Controller('agency/invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.Agency)
export class AgencyInvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly invoicePdfService: InvoicePdfService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List the agency\'s platform service fee invoices (#359)' })
    list(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.invoicesService.listAgencyInvoices(req.tenantId, page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one of the agency\'s platform service fee invoices with line items (#359)' })
    get(@Request() req, @Param('id') id: string) {
        return this.invoicesService.getAgencyInvoice(req.tenantId, id);
    }

    @Get(':id/pdf')
    @ApiOperation({ summary: 'Download the invoice PDF (#359)' })
    async pdf(@Request() req, @Param('id') id: string, @Res() res: Response) {
        const invoice = await this.invoicesService.getAgencyInvoice(req.tenantId, id);
        const buffer = await this.invoicePdfService.render(invoice);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
        res.send(buffer);
    }
}
