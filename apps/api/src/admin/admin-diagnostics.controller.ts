import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FeatureFlagsService } from '../common/feature-flags.service';
import { buildServerFlagsSnapshot } from './server-flags';

/**
 * #580 rework: server-flag diagnostics for the admin shell.
 *
 * The admin client build cannot see API env, so PR #598's readout
 * honestly said "not visible from this build" — and stayed useless.
 * This endpoint is the missing half: an admin-only read of the API's
 * effective flag states (see server-flags.ts for sources). It exposes
 * flag NAMES and booleans only — never env values or secrets.
 */
@ApiTags('AdminDiagnostics')
@Controller('admin/diagnostics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminDiagnosticsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get('flags')
  @ApiOperation({ summary: 'Effective server flag states for the admin diagnostics readout (#580)' })
  getFlags() {
    return buildServerFlagsSnapshot(this.featureFlags);
  }
}
