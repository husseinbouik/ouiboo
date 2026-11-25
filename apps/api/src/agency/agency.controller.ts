import { Controller, Get, UseGuards, Request, Patch, Body, Post, Query, Param, Res, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { UpdateAgencyProfileDto } from './dto/update-profile.dto';
import { AgencyProfileService } from './agency-profile.service';
import { AgencyDashboardService } from './agency-dashboard.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@ApiTags('Agency')
@Controller('agency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.Agency)
export class AgencyController {
    constructor(
        private readonly agencyProfileService: AgencyProfileService,
        private readonly agencyDashboardService: AgencyDashboardService,
    ) { }


    @Get('duplicate-credit-flags')
    @ApiOperation({ summary: 'List this agency\'s duplicate-credit flags (#494)' })
    async listDuplicateCreditFlags(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.listDuplicateCreditFlags(req);
    }


    @Post('subscription/cancel')
    @ApiOperation({ summary: 'Cancel the agency subscription at the end of the current period (#324)' })
    async cancelSubscription(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.cancelSubscription(req);
    }


    @Post('subscription/resume')
    @ApiOperation({ summary: 'Undo a scheduled subscription cancellation (#324)' })
    async resumeSubscription(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.resumeSubscription(req);
    }


    @Get('stats')
    @ApiOperation({ summary: 'Get agency dashboard stats' })
    async getStats(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.getStats(req);
    }


    @Get('trips')
    @ApiOperation({ summary: 'Get agency trips' })
    async getTrips(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.agencyDashboardService.getTrips(req, page, limit);
    }


    @Get('trips/:id')
    @ApiOperation({ summary: 'Get one agency-owned trip' })
    async getTrip(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.agencyDashboardService.getTrip(req, id);
    }


    @Get('bookings')
    @ApiOperation({ summary: 'Get agency bookings' })
    async getBookings(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
        return this.agencyDashboardService.getBookings(req, page, limit, status);
    }

    // #786 (Council S6 Phase 3, smallest useful slice): agency CRM —
    // contacts + booking pipeline derived from the agency's OWN
    // bookings. Tenant isolation is structural, exactly like the #780
    // exports: every query is scoped by req.tenantId (stamped by
    // TenantGuard from the authenticated principal) plus the row-level
    // agencyId tenant stamp (#428). No agency id, and no traveller id,
    // is ever accepted from the request, so there is no cross-agency
    // or cross-traveller surface. No new personal data is collected:
    // a contact is the traveller's bookings with this agency,
    // aggregated. Amounts are display-only sums of booking totals —
    // travellers pay the agency directly; Ouiboo holds no funds here.
    @Get('crm/contacts')
    @ApiOperation({ summary: 'List this agency\'s traveller contacts derived from its bookings (#786)' })
    async getCrmContacts(
        @Request() req: AuthenticatedRequest,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.agencyDashboardService.getCrmContacts(req, page, limit, search);
    }


    @Get('crm/pipeline')
    @ApiOperation({ summary: 'Get this agency\'s booking pipeline grouped by status (#786)' })
    async getCrmPipeline(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.getCrmPipeline(req);
    }


    // #780 (Council S6 Phase 3): self-serve CSV export of the agency's OWN
    // data. Tenant isolation is structural: every query is scoped by
    // req.tenantId — the agency id stamped by TenantGuard from the
    // authenticated principal — plus the row-level agencyId tenant stamp
    // (#428). No agency id is ever accepted from the request.
    @Get('exports/bookings')
    @ApiOperation({ summary: 'Export this agency\'s bookings as CSV (#780)' })
    async exportBookings(@Request() req: AuthenticatedRequest, @Res() res: Response) {
        return this.agencyDashboardService.exportBookings(req, res);
    }


    @Get('exports/trips')
    @ApiOperation({ summary: 'Export this agency\'s trips as CSV (#780)' })
    async exportTrips(@Request() req: AuthenticatedRequest, @Res() res: Response) {
        return this.agencyDashboardService.exportTrips(req, res);
    }


    @Get('exports/reviews')
    @ApiOperation({ summary: 'Export this agency\'s reviews as CSV (#780)' })
    async exportReviews(@Request() req: AuthenticatedRequest, @Res() res: Response) {
        return this.agencyDashboardService.exportReviews(req, res);
    }


    @Get('payments/overview')
    @ApiOperation({ summary: 'Get agency payments overview (external payment facts, no OuiBoo balance)' })
    async getPaymentsOverview(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.getPaymentsOverview(req);
    }


    @Get('payments')
    @ApiOperation({ summary: 'List agency external payments (traveller payments held by the agency / its PSP)' })
    async getPayments(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.agencyDashboardService.getPayments(req, page, limit);
    }


    @Get('reviews')
    @ApiOperation({ summary: 'Get agency reviews' })
    async getReviews(@Request() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.agencyDashboardService.getReviews(req, page, limit);
    }


    @Get('reviews/stats')
    @ApiOperation({ summary: 'Get agency review statistics' })
    async getReviewStats(@Request() req: AuthenticatedRequest) {
        return this.agencyDashboardService.getReviewStats(req);
    }

    @Patch('profile') // Use Patch/Put, no ID param needed as we use req.user
    @ApiOperation({ summary: 'Update agency profile' })
    async updateProfile(@Request() req: AuthenticatedRequest, @Body() data: UpdateAgencyProfileDto) {
        return this.agencyProfileService.updateProfile(req, data);
    }
}
