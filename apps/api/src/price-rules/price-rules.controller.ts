import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { PriceRulesService } from './price-rules.service';
import { CreateSessionPriceRuleDto, SetSessionPriceRuleActiveDto } from './dto/price-rule.dto';

/**
 * #755: campaign/session pricing. Agency-owned only (TenantGuard +
 * every service query filtered by the caller's agency); the agency
 * funds 100% of every discount its rules grant — Ouiboo never funds
 * promotions.
 */
@ApiTags('Price rules')
@Controller('price-rules')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
@Roles(UserRole.Agency)
@ApiBearerAuth()
export class PriceRulesController {
    constructor(private readonly priceRulesService: PriceRulesService) { }

    @Get()
    @ApiOperation({ summary: 'List my agency session price rules (#755)' })
    list(@Request() req) {
        return this.priceRulesService.list(req.tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Create an agency-funded session price rule (#755)' })
    create(@Request() req, @Body() dto: CreateSessionPriceRuleDto) {
        return this.priceRulesService.create(req.tenantId, req.user.userId ?? req.user.id, dto);
    }

    @Patch(':id/active')
    @ApiOperation({ summary: 'Activate or deactivate one of my price rules (#755)' })
    setActive(@Request() req, @Param('id') id: string, @Body() dto: SetSessionPriceRuleActiveDto) {
        return this.priceRulesService.setActive(req.tenantId, req.user.userId ?? req.user.id, id, dto.isActive);
    }
}
