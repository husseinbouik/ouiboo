import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCustomTripOfferDto, CreateCustomTripRequestDto } from './dto/custom-trip.dto';
import { CustomTripsService } from './custom-trips.service';

/**
 * #684 (Council S6): custom-trip requests (private RFQ). Every route
 * 404s while CUSTOM_TRIP_REQUESTS_ENABLED is off (the default) — the
 * feature presents as unavailable until the legal gate opens it.
 */
@ApiTags('CustomTrips')
@Controller('custom-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomTripsController {
    constructor(private readonly customTripsService: CustomTripsService) { }

    @Post('requests')
    @ApiOperation({ summary: 'Traveller authors a custom-trip request (private; matched verified cluster agencies only)' })
    create(@Request() req, @Body() dto: CreateCustomTripRequestDto) {
        return this.customTripsService.create(req.user.userId, dto);
    }

    @Get('requests/mine')
    @ApiOperation({ summary: 'The traveller\'s custom-trip requests, with offers and conversion state' })
    listMine(@Request() req) {
        return this.customTripsService.listMine(req.user.userId);
    }

    @Get('requests/agency')
    @ApiOperation({ summary: 'Pseudonymised custom-trip requests matched to the signed-in agency' })
    listForAgency(@Request() req) {
        return this.customTripsService.listForAgency(req.user.userId);
    }

    @Get('requests/agency/:id')
    @ApiOperation({ summary: 'One matched request (pseudonymised; identity only for the accepted agency post-acceptance)' })
    getForAgency(@Request() req, @Param('id') id: string) {
        return this.customTripsService.getForAgency(req.user.userId, id);
    }

    @Post('requests/:id/offers')
    @ApiOperation({ summary: 'Agency replies with a firm MAD TTC quote — transmitted unchanged and snapshotted on acceptance' })
    createOffer(@Request() req, @Param('id') id: string, @Body() dto: CreateCustomTripOfferDto) {
        return this.customTripsService.createOffer(req.user.userId, id, dto);
    }

    @Patch('requests/:id/offers/:offerId/withdraw')
    @ApiOperation({ summary: 'Agency withdraws its open quote' })
    withdrawOffer(@Request() req, @Param('id') id: string, @Param('offerId') offerId: string) {
        return this.customTripsService.withdrawOffer(req.user.userId, id, offerId);
    }

    @Patch('requests/:id/accept/:offerId')
    @ApiOperation({ summary: 'Traveller accepts an offer — quote snapshotted; request converts to a private/unlisted Trip' })
    accept(@Request() req, @Param('id') id: string, @Param('offerId') offerId: string) {
        return this.customTripsService.accept(req.user.userId, id, offerId);
    }

    @Patch('requests/:id/cancel')
    @ApiOperation({ summary: 'Traveller cancels the request' })
    cancel(@Request() req, @Param('id') id: string) {
        return this.customTripsService.cancel(req.user.userId, id);
    }
}
