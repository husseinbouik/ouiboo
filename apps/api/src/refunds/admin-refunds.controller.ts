import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RefundsService } from './refunds.service';
import {
    AdminReviewRefundDto,
    ApproveRefundDto,
    CompleteRefundDto,
    CreateRefundCaseDto,
    FailRefundDto,
    InitiateRefundDto,
    RejectRefundDto,
    RepairRefundCaseDto,
} from './dto/refund-actions.dto';

@ApiTags('AdminRefunds')
@Controller('admin/refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminRefundsController {
    constructor(private readonly refundsService: RefundsService) { }

    private actor(req): { id: string; email?: string | null } {
        return { id: req.user.userId, email: req.user.email ?? null };
    }

    @Get()
    @ApiOperation({
        summary: 'List refund cases across agencies (#370)',
        description:
            'Pass auditQueue=true for the #416 audit queue: completed cases flagged for risk-based audit (auditRequired) that no admin has reviewed yet (auditedAt is null).',
    })
    list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
        @Query('agencyId') agencyId?: string,
        @Query('auditQueue') auditQueue?: string,
    ) {
        return this.refundsService.listAdminCases({ page, limit, status, agencyId, auditQueue });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one refund case (#370)' })
    get(@Param('id') id: string) {
        return this.refundsService.getCaseForActor(id, 'ADMIN', null);
    }

    @Post()
    @ApiOperation({ summary: 'Open a refund case for a paid booking (#370)' })
    create(@Request() req, @Body() dto: CreateRefundCaseDto) {
        return this.refundsService.createCase(this.actor(req), 'ADMIN', null, dto);
    }

    @Post(':id/review')
    @ApiOperation({ summary: 'Begin eligibility review of a refund case (#370)' })
    review(@Request() req, @Param('id') id: string) {
        return this.refundsService.beginReview(this.actor(req), 'ADMIN', null, id);
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve a refund case (#370)' })
    approve(@Request() req, @Param('id') id: string, @Body() dto: ApproveRefundDto) {
        return this.refundsService.approve(this.actor(req), 'ADMIN', null, id, dto);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject a refund case with a reason (#370)' })
    reject(@Request() req, @Param('id') id: string, @Body() dto: RejectRefundDto) {
        return this.refundsService.reject(this.actor(req), 'ADMIN', null, id, dto);
    }

    @Post(':id/initiate')
    @ApiOperation({ summary: 'Mark a refund as initiated (#370)' })
    initiate(@Request() req, @Param('id') id: string, @Body() dto: InitiateRefundDto) {
        return this.refundsService.initiate(this.actor(req), 'ADMIN', null, id, dto);
    }

    @Post(':id/admin-review')
    @ApiOperation({ summary: 'Record an admin review as tier-5 evidence (#416, B8)', description: 'Separate step from completion: records a tier-5 ADMIN_REVIEW evidence row with a mandatory written reason and an attached document and/or external reference. A later complete() call consumes the row as pre-existing evidence.' })
    adminReview(@Request() req, @Param('id') id: string, @Body() dto: AdminReviewRefundDto) {
        return this.refundsService.adminReview(this.actor(req), 'ADMIN', id, dto);
    }

    @Post(':id/complete')
    @ApiOperation({ summary: 'Complete a refund case (#370, #416)', description: 'Completes only on the case\'s pre-existing qualifying evidence. With none, completion fails (400) and nothing is written — record an admin review first (POST :id/admin-review) when the completion rests on an admin review.' })
    complete(@Request() req, @Param('id') id: string, @Body() dto: CompleteRefundDto) {
        return this.refundsService.complete(this.actor(req), 'ADMIN', null, id, dto);
    }

    @Post(':id/fail')
    @ApiOperation({ summary: 'Report a refund attempt as failed (#370)' })
    fail(@Request() req, @Param('id') id: string, @Body() dto: FailRefundDto) {
        return this.refundsService.fail(this.actor(req), 'ADMIN', null, id, dto);
    }

    @Post(':id/repair')
    @ApiOperation({ summary: 'Admin-only repair of a stuck refund case: reopen a terminal case, correct its amount, or relink its payment (#423)' })
    repair(@Request() req, @Param('id') id: string, @Body() dto: RepairRefundCaseDto) {
        return this.refundsService.repairCaseAsAdmin(this.actor(req), id, dto);
    }

    @Post(':id/audit')
    @ApiOperation({ summary: 'Mark a refund case as audited (#416)', description: 'Stamps auditedAt/auditedBy for a case in the risk-based audit queue (auditRequired). Auditing is a review obligation, not a completion blocker.' })
    audit(@Request() req, @Param('id') id: string) {
        return this.refundsService.markAudited(this.actor(req), id);
    }
}
