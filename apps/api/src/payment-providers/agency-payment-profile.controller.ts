import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { PaymentProfilesService } from './payment-profiles.service';
import { ConnectPaymentProfileDto } from './dto/payment-provider.dto';

/**
 * #373 — the agency's own payment-provider connection (plan §25). The
 * agency connects a payment solution under its own merchant identity;
 * no secret values are accepted or returned here — only the name of the
 * environment variable that holds the webhook secret.
 */
@ApiTags('Agency Payment Profile')
@Controller('agency/payment-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.Agency)
export class AgencyPaymentProfileController {
    constructor(private readonly profilesService: PaymentProfilesService) { }

    @Get()
    @ApiOperation({ summary: 'Get the connected payment profile for the current agency' })
    get(@Request() req) {
        return this.profilesService.getForAgency(req.tenantId);
    }

    @Post('connect')
    @ApiOperation({ summary: 'Connect (or replace) a payment provider under the agency merchant identity' })
    connect(@Request() req, @Body() dto: ConnectPaymentProfileDto) {
        return this.profilesService.connect(req.tenantId, dto);
    }

    @Post('verify')
    @ApiOperation({ summary: 'Mark the connected merchant account as verified and enable payments' })
    verify(@Request() req) {
        return this.profilesService.verify(req.tenantId);
    }

    @Post('disable')
    @ApiOperation({ summary: 'Disable the connected payment profile' })
    disable(@Request() req) {
        return this.profilesService.disable(req.tenantId);
    }
}
