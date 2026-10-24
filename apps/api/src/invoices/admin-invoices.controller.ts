import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';

@ApiTags('admin-invoices')
@Controller('admin/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminInvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly invoicePdfService: InvoicePdfService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List issued platform service fee invoices across agencies (#359)' })
    list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('agencyId') agencyId?: string,
        @Query('q') q?: string,
    ) {
        return this.invoicesService.listAllInvoices({ pageParam: page, limitParam: limit, agencyId, q });
    }

    @Post('generate')
    @ApiOperation({
        summary: 'Generate the monthly platform service fee invoice for one agency (#359). Idempotent per agency+period. A scheduler calling this per agency each month is a follow-up; generation is admin-triggered for now.',
    })
    generate(@Body() dto: GenerateInvoiceDto) {
        return this.invoicesService.generateMonthlyInvoice(
            dto.agencyId,
            dto.year,
            dto.month,
            dto.commissionRatePercent,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one invoice with line items (#359)' })
    get(@Param('id') id: string) {
        return this.invoicesService.getInvoiceById(id);
    }

    @Get(':id/pdf')
    @ApiOperation({ summary: 'Download the invoice PDF (#359)' })
    async pdf(@Param('id') id: string, @Res() res: Response) {
        const invoice = await this.invoicesService.getInvoiceById(id);
        const buffer = await this.invoicePdfService.render(invoice);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
        res.send(buffer);
    }
}
