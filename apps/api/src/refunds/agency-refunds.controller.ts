import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RefundsService } from './refunds.service';
import {
    ApproveRefundDto,
    CompleteRefundDto,
    CreateRefundCaseDto,
    FailRefundDto,
    InitiateRefundDto,
    RejectRefundDto,
} from './dto/refund-actions.dto';

@ApiTags('AgencyRefunds')
@Controller('agency/refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.Agency)
export class AgencyRefundsController {
    constructor(private readonly refundsService: RefundsService) { }

    private actor(req): { id: string; email?: string | null } {
        return { id: req.user.userId, email: req.user.email ?? null };
    }

    @Get()
    @ApiOperation({ summary: 'List the agency\'s refund cases (#370)' })
    list(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.refundsService.listAgencyCases(req.tenantId, { page, limit, status });
    }

    @Get('action-required-count')
    @ApiOperation({ summary: 'Count of refund cases waiting on the agency (#370)' })
    actionRequiredCount(@Request() req) {
        return this.refundsService.countAgencyActionRequired(req.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one of the agency\'s refund cases (#370)' })
    get(@Request() req, @Param('id') id: string) {
        return this.refundsService.getCaseForActor(id, 'AGENCY', req.tenantId);
    }

    @Post()
    @ApiOperation({
        summary: 'Open a refund case for one of the agency\'s paid bookings (#370)',
        description:
            'Used when the agency cancels a paid booking. The case starts in AGENCY_ACTION_REQUIRED with the refund SLA clock running.',
    })
    create(@Request() req, @Body() dto: CreateRefundCaseDto) {
        return this.refundsService.createCase(this.actor(req), 'AGENCY', req.tenantId, dto);
    }

    @Post(':id/review')
    @ApiOperation({ summary: 'Begin eligibility review of a refund case (#370)' })
    review(@Request() req, @Param('id') id: string) {
        return this.refundsService.beginReview(this.actor(req), 'AGENCY', req.tenantId, id);
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve a refund case (#370)' })
    approve(@Request() req, @Param('id') id: string, @Body() dto: ApproveRefundDto) {
        return this.refundsService.approve(this.actor(req), 'AGENCY', req.tenantId, id, dto);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject a refund case with a reason (#370)' })
    reject(@Request() req, @Param('id') id: string, @Body() dto: RejectRefundDto) {
        return this.refundsService.reject(this.actor(req), 'AGENCY', req.tenantId, id, dto);
    }

    @Post(':id/initiate')
    @ApiOperation({ summary: 'Mark a refund as initiated with the payment provider / bank (#370)' })
    initiate(@Request() req, @Param('id') id: string, @Body() dto: InitiateRefundDto) {
        return this.refundsService.initiate(this.actor(req), 'AGENCY', req.tenantId, id, dto);
    }

    @Post(':id/complete')
    @ApiOperation({ summary: 'Mark a refund as completed (#370)' })
    complete(@Request() req, @Param('id') id: string, @Body() dto: CompleteRefundDto) {
        return this.refundsService.complete(this.actor(req), 'AGENCY', req.tenantId, id, dto);
    }

    @Post(':id/fail')
    @ApiOperation({ summary: 'Report a refund attempt as failed (#370)' })
    fail(@Request() req, @Param('id') id: string, @Body() dto: FailRefundDto) {
        return this.refundsService.fail(this.actor(req), 'AGENCY', req.tenantId, id, dto);
    }
}
