import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripPricingController } from './pricing.controller';

@Module({
    controllers: [TripsController, TripPricingController],
    providers: [TripsService],
})
export class TripsModule { }
