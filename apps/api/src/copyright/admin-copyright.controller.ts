import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CopyrightService } from './copyright.service';
import { ResolveCopyrightReportDto } from './dto/copyright.dto';

type AuthedRequest = { user?: { id?: string; sub?: string } };

@ApiTags('admin-copyright')
@Controller('admin/copyright')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminCopyrightController {
    constructor(private copyrightService: CopyrightService) { }

    @Get('reports')
    @ApiOperation({ summary: 'List copyright takedown reports' })
    list(@Query('status') status?: string) {
        return this.copyrightService.listReports(status);
    }

    @Patch('reports/:id')
    @ApiOperation({ summary: 'Resolve a copyright report; ACTIONED + tripId takes the trip down' })
    resolve(
        @Param('id') id: string,
        @Body() dto: ResolveCopyrightReportDto,
        @Request() req: AuthedRequest,
    ) {
        const adminId = req.user?.id ?? req.user?.sub ?? 'unknown-admin';
        return this.copyrightService.resolveReport(id, dto, adminId);
    }
}
