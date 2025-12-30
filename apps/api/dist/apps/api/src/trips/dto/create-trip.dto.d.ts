import { TripCategory, TripStatus } from '@ouiboo/types';
export declare class CreateTripTemplateDto {
    title: string;
    description: string;
    category: TripCategory;
    startLocation: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    images: string[];
    status: TripStatus;
}
export declare class CreateTripSessionDto {
    startDate: string;
    endDate: string;
    price: number;
    totalSeats: number;
}
