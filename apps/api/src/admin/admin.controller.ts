import { Controller, Get, Post, Body, Param, UseGuards, Patch, BadRequestException, Query, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    type BookingStatusType,
    type SubscriptionStatusType,
    UserRole,
    VerificationStatus,
    type VerificationStatusType,
    SubscriptionStatus,
    BookingStatus,
} from '@ouiboo/types';
import { Response } from 'express';
import { type MoneyInput } from '../common/money.util';
import { AdminQueryService } from './admin-query.service';
import { AdminVerificationService } from './admin-verification.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminController {
    constructor(
        private readonly adminQueryService: AdminQueryService,
        private readonly adminVerificationService: AdminVerificationService,
    ) { }


    @Get('pending-payments')
    @ApiOperation({ summary: 'Get payment proofs awaiting review or agency bank confirmation' })
    async getPendingPayments(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminQueryService.getPendingPayments(q, page, limit);
    }


    @Post('payments/:id/verify')
    @ApiOperation({ summary: 'Accept or reject a payment proof image (acceptance is not settlement, #422)' })
    async verifyPayment(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body('status') status: 'VERIFIED' | 'REJECTED',
        @Body('rejectionReason') rejectionReason?: string
    ) {
        return this.adminVerificationService.verifyPayment(req, id, status, rejectionReason);
    }


    @Get('overview-counts')
    @ApiOperation({ summary: 'Get lightweight counts for the admin dashboard' })
    async getOverviewCounts() {
        return this.adminQueryService.getOverviewCounts();
    }


    @Get('pending-agencies')
    @ApiOperation({ summary: 'Get agencies pending verification' })
    async getPendingAgencies(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminQueryService.getPendingAgencies(q, page, limit);
    }


    @Post('agencies/:id/verify')
    @ApiOperation({ summary: 'Approve or reject agency' })
    async verifyAgency(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED') {
        return this.adminVerificationService.verifyAgency(req, id, status);
    }


    @Post('agencies/:id/licence/verify')
    @ApiOperation({ summary: 'Verify or reject an agency travel licence (#371, hardened by #415)' })
    async verifyAgencyLicence(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; ministryChecked?: boolean },
    ) {
        return this.adminVerificationService.verifyAgencyLicence(req, id, body);
    }


    @Post('agencies/:id/insurance/verify')
    @ApiOperation({ summary: 'Verify or reject an agency RC insurance artefact (#415)' })
    async verifyAgencyInsurance(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; overrideReason?: string },
    ) {
        return this.adminVerificationService.verifyAgencyInsurance(req, id, body);
    }


    // #494 (B16): duplicate-credit reconciliation queue — agencies
    // flag second bank credits (invisible to the ledger); admin
    // reconciles manually and closes flags here. Ops record only.
    @Get('duplicate-credit-flags')
    @ApiOperation({ summary: 'List duplicate-credit flags for reconciliation (#494)' })
    async listDuplicateCreditFlags() {
        return this.adminQueryService.listDuplicateCreditFlags();
    }


    @Post('duplicate-credit-flags/:id/resolve')
    @ApiOperation({ summary: 'Resolve or dismiss a duplicate-credit flag (#494)' })
    async resolveDuplicateCreditFlag(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'RESOLVED' | 'DISMISSED'; resolutionNote?: string },
    ) {
        return this.adminVerificationService.resolveDuplicateCreditFlag(req, id, body);
    }


    @Post('agencies/:id/bank-details/verify')
    @ApiOperation({ summary: 'Verify or reject an agency bank payment destination (#421)' })
    async verifyAgencyBankDetails(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; overrideReason?: string },
    ) {
        return this.adminVerificationService.verifyAgencyBankDetails(req, id, body);
    }


    @Post('agencies/:id/cash-plus/verify')
    @ApiOperation({ summary: 'Verify or reject an agency Cash Plus payment destination (#988)' })
    async verifyAgencyCashPlus(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; overrideReason?: string },
    ) {
        return this.adminVerificationService.verifyAgencyCashPlus(req, id, body);
    }


    @Get('pending-trips')
    @ApiOperation({ summary: 'Get trips pending verification' })
    async getPendingTrips(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminQueryService.getPendingTrips(q, page, limit);
    }


    @Post('trips/:id/verify')
    @ApiOperation({ summary: 'Approve or reject trip' })
    async verifyTrip(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body('status') status: 'ACTIVE' | 'ARCHIVED') {
        return this.adminVerificationService.verifyTrip(req, id, status);
    }


    @Get('agencies')
    @ApiOperation({ summary: 'Get all agencies' })
    async getAgencies(
        @Query('q') q?: string,
        @Query('verificationStatus') verificationStatus?: string,
        @Query('subscriptionStatus') subscriptionStatus?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminQueryService.getAgencies(q, verificationStatus, subscriptionStatus, page, limit);
    }


    @Patch('agencies/:id/status')
    @ApiOperation({ summary: 'Update agency verification or subscription status' })
    async updateAgencyStatus(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() data: { verificationStatus?: VerificationStatusType; subscriptionStatus?: SubscriptionStatusType },
    ) {
        return this.adminVerificationService.updateAgencyStatus(req, id, data);
    }


    @Get('bookings')
    @ApiOperation({ summary: 'Get all bookings in the system' })
    async getBookings(
        @Query('q') q?: string,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminQueryService.getBookings(q, status, page, limit);
    }


    @Post('bookings/:id/refund')
    @ApiOperation({ summary: 'Refund a paid gateway booking' })
    async refundBooking(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body('amount') amount?: MoneyInput,
    ) {
        return this.adminVerificationService.refundBooking(req, id, amount);
    }


    @Get('audit-logs')
    @ApiOperation({ summary: 'List audit logs with optional filters' })
    async getAuditLogs(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('actorEmail') actorEmail?: string,
        @Query('targetType') targetType?: string,
        @Query('q') q?: string,
        @Query('limit') limit?: string,
        @Query('page') page?: string,
    ) {
        return this.adminQueryService.getAuditLogs(from, to, action, actorEmail, targetType, q, limit, page);
    }


    @Get('audit-logs/export')
    @ApiOperation({ summary: 'Export audit logs as CSV' })
    async exportAuditLogs(
        @Request() req: AuthenticatedRequest,
        @Res() res: Response,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('actorEmail') actorEmail?: string,
        @Query('targetType') targetType?: string,
        @Query('q') q?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminQueryService.exportAuditLogs(req, res, from, to, action, actorEmail, targetType, q, limit);
    }


    @Post('audit-logs/retention')
    @ApiOperation({ summary: 'Prune audit logs older than a retention window' })
    async pruneAuditLogs(
        @Request() req: AuthenticatedRequest,
        @Body('days') days?: number,
    ) {
        return this.adminQueryService.pruneAuditLogs(req, days);
    }
}
