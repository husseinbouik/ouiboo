import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RefundsService } from './refunds.service';
import { RequestRefundDto } from './dto/refund-actions.dto';

@ApiTags('Refunds')
@Controller('refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Traveler)
export class TravelerRefundsController {
    constructor(private readonly refundsService: RefundsService) { }

    @Post('request')
    @ApiOperation({
        summary: 'Request a refund for one of my bookings (#370)',
        description:
            'Opens a RefundCase for a booking with a verified payment. The refund itself is processed by the agency (traveller payments are made directly to the agency); OuiBoo tracks the case and its deadline.',
    })
    request(@Request() req, @Body() dto: RequestRefundDto) {
        return this.refundsService.requestRefund(req.user.userId, dto);
    }

    @Get('mine')
    @ApiOperation({ summary: 'List my refund cases (#370)' })
    mine(@Request() req, @Query() query: { page?: string; limit?: string }) {
        return this.refundsService.listTravelerCases(req.user.userId, query);
    }

    @Get('mine/:id')
    @ApiOperation({ summary: 'Get one of my refund cases (#370)' })
    get(@Request() req, @Param('id') id: string) {
        return this.refundsService.getCaseForActor(id, 'TRAVELER', req.user.userId);
    }
}
