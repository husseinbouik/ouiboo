import { Module } from '@nestjs/common';
import { CustomTripsController } from './custom-trips.controller';
import { CustomTripsService } from './custom-trips.service';

@Module({
    controllers: [CustomTripsController],
    providers: [CustomTripsService],
})
export class CustomTripsModule { }
