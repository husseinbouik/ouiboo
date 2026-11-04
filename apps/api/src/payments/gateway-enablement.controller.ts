import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsString, Length } from 'class-validator';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GatewayEnablementService } from './gateway-enablement.service';

class SetGatewayEnablementDto {
    @IsBoolean()
    enabled!: boolean;

    /** Fresh TOTP code from the admin's authenticator (MFA step-up). */
    @IsString()
    @Length(6, 10)
    totpCode!: string;
}

/**
 * #635 — admin surface for the DB-backed gateway enablement lock.
 * Reading the status is admin-only; changing it additionally requires
 * the MFA step-up enforced inside GatewayEnablementService.
 */
@ApiTags('AdminPayments')
@Controller('admin/payments/gateway-enablement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class GatewayEnablementController {
    constructor(private readonly enablement: GatewayEnablementService) { }

    @Get()
    @ApiOperation({ summary: 'Gateway enablement status: env flag AND platform setting (#635)' })
    getStatus() {
        return this.enablement.getStatus();
    }

    @Post()
    @ApiOperation({ summary: 'Set the gateway.enablement platform setting (admin + MFA step-up, audit-logged) (#635)' })
    setEnabled(@Request() req, @Body() dto: SetGatewayEnablementDto) {
        return this.enablement.setEnabled(
            { id: req.user.userId, email: req.user.email ?? null },
            dto.enabled,
            dto.totpCode,
        );
    }
}
