import { BadRequestException, Controller, Get, Post, Body, Param, UseGuards, Request, Query, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripTemplateDto, UpdateTripSessionDto } from './dto/create-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { SubscriptionGuard } from '../auth/subscription.guard';

const parseOptionalNumber = (value: string | undefined, name: string) => {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new BadRequestException(`${name} must be a valid number`);
    }
    return parsed;
};

const parseOptionalDate = (value: string | undefined, name: string) => {
    if (value === undefined) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException(`${name} must be a valid ISO date`);
    }
    return parsed;
};

const parsePositiveInteger = (value: string | undefined, fallback: number, name: string) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new BadRequestException(`${name} must be a positive integer`);
    }
    return parsed;
};

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    create(@Request() req, @Body() createTripDto: CreateTripTemplateDto) {
        return this.tripsService.createTemplate(req.tenantId, createTripDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all trip templates with advanced filters' })
    findAll(
        @Query('featured') featured?: string,
        @Query('status') status?: string,
        @Query('q') q?: string,
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('agencyId') agencyId?: string,
        @Query('currency') currency?: string,
        @Query('priceMin') priceMin?: string,
        @Query('priceMax') priceMax?: string,
        @Query('durationMin') durationMin?: string,
        @Query('durationMax') durationMax?: string,
        @Query('startDateFrom') startDateFrom?: string,
        @Query('startDateTo') startDateTo?: string,
        @Query('ratingMin') ratingMin?: string,
        @Query('available') available?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.tripsService.findAllTemplates({
            featured: featured === 'true',
            status,
            q: q || search,
            category,
            agencyId,
            currency,
            priceMin: parseOptionalNumber(priceMin, 'priceMin'),
            priceMax: parseOptionalNumber(priceMax, 'priceMax'),
            durationMin: parseOptionalNumber(durationMin, 'durationMin'),
            durationMax: parseOptionalNumber(durationMax, 'durationMax'),
            startDateFrom: parseOptionalDate(startDateFrom, 'startDateFrom'),
            startDateTo: parseOptionalDate(startDateTo, 'startDateTo'),
            ratingMin: parseOptionalNumber(ratingMin, 'ratingMin'),
            available: available === 'true',
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc',
            page: parsePositiveInteger(page, 1, 'page'),
            limit: parsePositiveInteger(limit, 20, 'limit'),
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get trip template by ID' })
    findOne(@Param('id') id: string) {
        return this.tripsService.findOneTemplate(id);
    }

    @Post(':id/sessions')
    @ApiOperation({ summary: 'Add a session to a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    createSession(
        @Request() req,
        @Param('id') id: string,
        @Body() createSessionDto: CreateTripSessionDto,
    ) {
        return this.tripsService.createSession(req.tenantId, id, createSessionDto);
    }

    @Patch(':id/sessions/:sessionId')
    @ApiOperation({ summary: 'Update a trip session without bookings' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    updateSession(
        @Request() req,
        @Param('id') id: string,
        @Param('sessionId') sessionId: string,
        @Body() dto: UpdateTripSessionDto,
    ) {
        return this.tripsService.updateSession(req.tenantId, id, sessionId, dto);
    }

    @Delete(':id/sessions/:sessionId')
    @ApiOperation({ summary: 'Delete a trip session without bookings' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    deleteSession(
        @Request() req,
        @Param('id') id: string,
        @Param('sessionId') sessionId: string,
    ) {
        return this.tripsService.deleteSession(req.tenantId, id, sessionId);
    }

    @Get(':id/sessions')
    @ApiOperation({ summary: 'Get all sessions for a trip template' })
    findSessions(@Param('id') id: string) {
        return this.tripsService.findSessionsByTemplate(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    update(@Request() req, @Param('id') id: string, @Body() updateTripDto: UpdateTripTemplateDto) {
        return this.tripsService.updateTemplate(id, req.tenantId, updateTripDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Permanently delete a draft trip (drafts with no sessions only)' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    remove(@Request() req, @Param('id') id: string) {
        return this.tripsService.deleteTemplate(id, req.tenantId);
    }

    @Post(':id/archive')
    @ApiOperation({ summary: 'Archive a trip (preserves all records, reversible)' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    archive(@Request() req, @Param('id') id: string) {
        return this.tripsService.archiveTemplate(id, req.tenantId);
    }

    @Post(':id/restore')
    @ApiOperation({ summary: 'Restore an archived trip' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    restore(@Request() req, @Param('id') id: string) {
        return this.tripsService.restoreTemplate(id, req.tenantId);
    }

    @Post(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate a trip (hide from marketplace, keep bookings)' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    deactivate(@Request() req, @Param('id') id: string) {
        return this.tripsService.deactivateTemplate(id, req.tenantId);
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Re-activate a deactivated trip' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
    @Roles(UserRole.Agency)
    activate(@Request() req, @Param('id') id: string) {
        return this.tripsService.activateTemplate(id, req.tenantId);
    }
}
