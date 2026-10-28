import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ouiboo/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupportService } from './support.service';
import { UpdateSupportTicketDto } from './dto/support.dto';

type AuthedRequest = { user?: { id?: string; sub?: string } };

@ApiTags('admin-support')
@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminSupportController {
  constructor(private supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List help-centre support tickets (admin, #446)' })
  list(@Query('status') status?: string, @Query('category') category?: string) {
    return this.supportService.listTickets(status, category);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Update a support ticket; first move out of OPEN stamps the first response (#446)' })
  update(@Param('id') id: string, @Body() dto: UpdateSupportTicketDto, @Request() req: AuthedRequest) {
    const adminId = req.user?.id ?? req.user?.sub ?? 'unknown-admin';
    return this.supportService.updateTicket(id, dto, adminId);
  }
}
