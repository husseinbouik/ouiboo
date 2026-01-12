import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripTemplateDto } from './dto/create-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Agency)
    create(@Request() req, @Body() createTripDto: CreateTripTemplateDto) {
        console.log('Creating trip template with data:', JSON.stringify(createTripDto, null, 2));
        return this.tripsService.createTemplate(req.user.userId, createTripDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all trip templates' })
    findAll(@Query('featured') featured?: string, @Query('status') status?: string, @Query('agencyId') agencyId?: string) {
        return this.tripsService.findAllTemplates(featured === 'true', status, agencyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get trip template by ID' })
    findOne(@Param('id') id: string) {
        console.log('[TripsController] Finding trip with ID:', id);
        return this.tripsService.findOneTemplate(id);
    }

    @Post(':id/sessions')
    @ApiOperation({ summary: 'Add a session to a trip template' })
    createSession(
        @Param('id') id: string,
        @Body() createSessionDto: CreateTripSessionDto,
    ) {
        return this.tripsService.createSession(id, createSessionDto);
    }

    @Get(':id/sessions')
    @ApiOperation({ summary: 'Get all sessions for a trip template' })
    findSessions(@Param('id') id: string) {
        return this.tripsService.findSessionsByTemplate(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Agency)
    update(@Request() req, @Param('id') id: string, @Body() updateTripDto: UpdateTripTemplateDto) {
        console.log('Updating trip template', id, 'with data:', JSON.stringify(updateTripDto, null, 2));
        return this.tripsService.updateTemplate(id, req.user.userId, updateTripDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a trip template' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Agency)
    remove(@Request() req, @Param('id') id: string) {
        return this.tripsService.deleteTemplate(id, req.user.userId);
    }
}
