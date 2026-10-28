import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminInterventionsService } from './admin-interventions.service';
import {
    ExtendDeadlineDto,
    InterventionReasonDto,
    RepairBookingDto,
} from './dto/admin-interventions.dto';

/**
 * #423 — admin stuck-state interventions (Council P0-21). Every action
 * is admin-only, requires a written reason, and writes its AuditLog row
 * in the same transaction as the state change. Refund-case repairs live
 * on AdminRefundsController (`POST /admin/refunds/:id/repair`).
 */
@ApiTags('AdminInterventions')
@Controller('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminInterventionsController {
    constructor(private readonly interventionsService: AdminInterventionsService) { }

    private actor(req): { id: string; email?: string | null } {
        return { id: req.user.userId, email: req.user.email ?? null };
    }

    @Get('groups/pending')
    @ApiOperation({ summary: 'List staged sessions still pending their minimum group (#423)' })
    listPendingGroups(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('q') q?: string,
    ) {
        return this.interventionsService.listPendingGroups({ page, limit, q });
    }

    @Post('sessions/:sessionId/force-confirm-group')
    @ApiOperation({ summary: 'Force-confirm a pending-minimum group, ignoring the minimum and the deadline (#423)' })
    forceConfirmGroup(
        @Request() req,
        @Param('sessionId') sessionId: string,
        @Body() dto: InterventionReasonDto,
    ) {
        return this.interventionsService.forceConfirmGroup(this.actor(req), sessionId, dto.reason);
    }

    @Post('sessions/:sessionId/close-group')
    @ApiOperation({ summary: 'Close a pending-minimum group as not confirmed; deposits become refund-due cases immediately (#423)' })
    closeGroup(
        @Request() req,
        @Param('sessionId') sessionId: string,
        @Body() dto: InterventionReasonDto,
    ) {
        return this.interventionsService.closeGroup(this.actor(req), sessionId, dto.reason);
    }

    @Post('sessions/:sessionId/extend-deadline')
    @ApiOperation({ summary: 'Extend a pending group confirmation deadline (session and plan snapshots) (#423)' })
    extendDeadline(
        @Request() req,
        @Param('sessionId') sessionId: string,
        @Body() dto: ExtendDeadlineDto,
    ) {
        return this.interventionsService.extendDeadline(
            this.actor(req),
            sessionId,
            dto.newDeadline,
            dto.reason,
        );
    }

    @Post('bookings/:bookingId/repair')
    @ApiOperation({ summary: 'Run a named repair on a stuck booking: resync-payment-state, requeue-proof-review, or open-refund-case (#423)' })
    repairBooking(
        @Request() req,
        @Param('bookingId') bookingId: string,
        @Body() dto: RepairBookingDto,
    ) {
        return this.interventionsService.repairBooking(
            this.actor(req),
            bookingId,
            dto.action,
            dto.reason,
        );
    }
}
