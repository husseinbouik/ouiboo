import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentReconciliationStatus } from '@ouiboo/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { PaymentReconciliationService } from './reconciliation.service';

/**
 * #373 — admin surface for payment reconciliation (plan §51): trigger a
 * run, list the mismatch alerts it produced, and record resolution.
 * Resolving a mismatch never edits payment state.
 */
@ApiTags('Admin Payment Reconciliation')
@Controller('admin/payment-reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminPaymentReconciliationController {
    constructor(private readonly reconciliationService: PaymentReconciliationService) { }

    @Post('run')
    @ApiOperation({ summary: 'Run payment reconciliation now' })
    run() {
        return this.reconciliationService.runReconciliation();
    }

    @Get('mismatches')
    @ApiOperation({ summary: 'List reconciliation mismatch alerts' })
    list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        const parsedStatus = status && (Object.values(PaymentReconciliationStatus) as string[]).includes(status)
            ? (status as PaymentReconciliationStatus)
            : undefined;
        return this.reconciliationService.listMismatches(
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
            parsedStatus,
        );
    }

    @Patch('mismatches/:id/resolve')
    @ApiOperation({ summary: 'Mark a reconciliation mismatch as resolved' })
    resolve(@Param('id') id: string) {
        return this.reconciliationService.resolveMismatch(id);
    }
}
