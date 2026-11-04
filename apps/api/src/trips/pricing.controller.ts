import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { UpsertAddOnDto, UpsertPricingVariantDto } from './dto/pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { SubscriptionGuard } from '../auth/subscription.guard';

/**
 * #695 (Council S6): agency-priced variants + paid add-ons on a trip.
 * Agency-owned only (TenantGuard + the service re-checks template
 * ownership); prices are set by the agency and charged to the traveller
 * as part of the agency's own trip price — Ouiboo never touches it.
 */
@ApiTags('Trips')
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
@Roles(UserRole.Agency)
@ApiBearerAuth()
export class TripPricingController {
    constructor(private readonly tripsService: TripsService) { }

    @Get(':id/pricing')
    @ApiOperation({ summary: 'List a trip\'s pricing variants and add-ons (agency view, incl. inactive)' })
    list(@Request() req, @Param('id') id: string) {
        return this.tripsService.listTripPricing(req.tenantId, id);
    }

    @Post(':id/variants')
    @ApiOperation({ summary: 'Create a pricing variant (option tier) on a trip' })
    createVariant(@Request() req, @Param('id') id: string, @Body() dto: UpsertPricingVariantDto) {
        return this.tripsService.createPricingVariant(req.tenantId, id, dto);
    }

    @Patch(':id/variants/:variantId')
    @ApiOperation({ summary: 'Update a pricing variant on a trip' })
    updateVariant(@Request() req, @Param('id') id: string, @Param('variantId') variantId: string, @Body() dto: UpsertPricingVariantDto) {
        return this.tripsService.updatePricingVariant(req.tenantId, id, variantId, dto);
    }

    @Delete(':id/variants/:variantId')
    @ApiOperation({ summary: 'Delete a pricing variant from a trip' })
    deleteVariant(@Request() req, @Param('id') id: string, @Param('variantId') variantId: string) {
        return this.tripsService.deletePricingVariant(req.tenantId, id, variantId);
    }

    @Post(':id/add-ons')
    @ApiOperation({ summary: 'Create a paid add-on on a trip' })
    createAddOn(@Request() req, @Param('id') id: string, @Body() dto: UpsertAddOnDto) {
        return this.tripsService.createAddOn(req.tenantId, id, dto);
    }

    @Patch(':id/add-ons/:addOnId')
    @ApiOperation({ summary: 'Update a paid add-on on a trip' })
    updateAddOn(@Request() req, @Param('id') id: string, @Param('addOnId') addOnId: string, @Body() dto: UpsertAddOnDto) {
        return this.tripsService.updateAddOn(req.tenantId, id, addOnId, dto);
    }

    @Delete(':id/add-ons/:addOnId')
    @ApiOperation({ summary: 'Delete a paid add-on from a trip' })
    deleteAddOn(@Request() req, @Param('id') id: string, @Param('addOnId') addOnId: string) {
        return this.tripsService.deleteAddOn(req.tenantId, id, addOnId);
    }
}
