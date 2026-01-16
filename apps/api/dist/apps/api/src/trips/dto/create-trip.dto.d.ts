import { TripCategory, TripStatus } from '@ouiboo/types';
export declare class ItineraryDayDto {
    dayNumber: number;
    title?: string;
    description: string;
    activities: string[];
}
export declare class CreateTripTemplateDto {
    title: string;
    description: string;
    category: TripCategory;
    startLocation: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    exclusions: string[];
    checklist: string[];
    images: string[];
    status: TripStatus;
    itinerary?: ItineraryDayDto[];
}
declare const UpdateTripTemplateDto_base: import("@nestjs/common").Type<Partial<CreateTripTemplateDto>>;
export declare class UpdateTripTemplateDto extends UpdateTripTemplateDto_base {
}
export declare class CreateTripSessionDto {
    startDate: string;
    endDate: string;
    price: number;
    deposit: number;
    totalSeats: number;
}
export {};
