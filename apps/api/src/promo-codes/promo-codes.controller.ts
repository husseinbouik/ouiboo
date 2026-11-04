import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto, SetPromoCodeActiveDto } from './dto/promo-code.dto';

/**
 * #778 (Council S6 Phase 3): agency-funded promo codes. Agency-owned
 * only (TenantGuard + every service query filtered by the caller's
 * agency); the agency funds 100% of the discount — Ouiboo never funds
 * promotions.
 */
@ApiTags('Promo codes')
@Controller('promo-codes')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
@Roles(UserRole.Agency)
@ApiBearerAuth()
export class PromoCodesController {
    constructor(private readonly promoCodesService: PromoCodesService) { }

    @Get()
    @ApiOperation({ summary: 'List my agency promo codes (#778)' })
    list(@Request() req) {
        return this.promoCodesService.list(req.tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Create an agency-funded promo code (#778)' })
    create(@Request() req, @Body() dto: CreatePromoCodeDto) {
        return this.promoCodesService.create(req.tenantId, dto);
    }

    @Patch(':id/active')
    @ApiOperation({ summary: 'Activate or deactivate one of my promo codes (#778)' })
    setActive(@Request() req, @Param('id') id: string, @Body() dto: SetPromoCodeActiveDto) {
        return this.promoCodesService.setActive(req.tenantId, id, dto.isActive);
    }
}
