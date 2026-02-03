import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripTemplateDto } from './dto/create-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
    @Roles(UserRole.Agency)
    create(@Request() req, @Body() createTripDto: CreateTripTemplateDto) {
        console.log('Creating trip template with data:', JSON.stringify(createTripDto, null, 2));
        return this.tripsService.createTemplate(req.tenantId, createTripDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all trip templates with advanced filters' })
    findAll(
        @Query('featured') featured?: string,
        @Query('status') status?: string,
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
            priceMin: priceMin ? parseFloat(priceMin) : undefined,
            priceMax: priceMax ? parseFloat(priceMax) : undefined,
            durationMin: durationMin ? parseInt(durationMin) : undefined,
            durationMax: durationMax ? parseInt(durationMax) : undefined,
            startDateFrom: startDateFrom ? new Date(startDateFrom) : undefined,
            startDateTo: startDateTo ? new Date(startDateTo) : undefined,
            ratingMin: ratingMin ? parseFloat(ratingMin) : undefined,
            available: available === 'true',
            sortBy: sortBy || 'createdAt',
            sortOrder: (sortOrder || 'desc').toLowerCase() as 'asc' | 'desc',
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get trip template by ID' })
    findOne(@Param('id') id: string) {
        console.log('[TripsController] Finding trip with ID:', id);
        return this.tripsService.findOneTemplate(id);
    }

    @Post(':id/sessions')
    @ApiOperation({ summary: 'Add a session to a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
    @Roles(UserRole.Agency)
    createSession(
        @Request() req,
        @Param('id') id: string,
        @Body() createSessionDto: CreateTripSessionDto,
    ) {
        return this.tripsService.createSession(req.tenantId, id, createSessionDto);
    }

    @Get(':id/sessions')
    @ApiOperation({ summary: 'Get all sessions for a trip template' })
    findSessions(@Param('id') id: string) {
        return this.tripsService.findSessionsByTemplate(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
    @Roles(UserRole.Agency)
    update(@Request() req, @Param('id') id: string, @Body() updateTripDto: UpdateTripTemplateDto) {
        console.log('Updating trip template', id, 'with data:', JSON.stringify(updateTripDto, null, 2));
        return this.tripsService.updateTemplate(id, req.tenantId, updateTripDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
    @Roles(UserRole.Agency)
    remove(@Request() req, @Param('id') id: string) {
        return this.tripsService.deleteTemplate(id, req.tenantId);
    }
}
