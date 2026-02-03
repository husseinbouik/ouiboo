import { DatabaseService } from '../database/database.service';
export declare class WishlistService {
    private prisma;
    constructor(prisma: DatabaseService);
    addToWishlist(userId: string, tripId: string): Promise<{
        tripTemplate: {
            description: string;
            title: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            agencyId: string;
            category: import("@ouiboo/database").$Enums.TripCategory;
            startLocation: string;
            durationDays: number;
            durationNights: number;
            inclusions: string[];
            exclusions: string[];
            checklist: string[];
            images: string[];
            status: import("@ouiboo/database").$Enums.TripStatus;
            featured: boolean;
            averageRating: number | null;
            reviewCount: number;
            lastReviewDate: Date | null;
            cancellationPolicy: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
            minBookings: number;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        tripTemplateId: string;
    }>;
    removeFromWishlist(userId: string, tripId: string): Promise<{
        success: boolean;
    }>;
    getUserWishlist(userId: string, page?: number, limit?: number): Promise<{
        wishlists: ({
            tripTemplate: {
                agency: {
                    id: string;
                    companyName: string;
                    logo: string;
                };
                sessions: {
                    id: string;
                    startDate: Date;
                    endDate: Date;
                    price: number;
                }[];
            } & {
                description: string;
                title: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                agencyId: string;
                category: import("@ouiboo/database").$Enums.TripCategory;
                startLocation: string;
                durationDays: number;
                durationNights: number;
                inclusions: string[];
                exclusions: string[];
                checklist: string[];
                images: string[];
                status: import("@ouiboo/database").$Enums.TripStatus;
                featured: boolean;
                averageRating: number | null;
                reviewCount: number;
                lastReviewDate: Date | null;
                cancellationPolicy: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
                minBookings: number;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            tripTemplateId: string;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    isInWishlist(userId: string, tripId: string): Promise<boolean>;
    getWishlistCount(userId: string): Promise<number>;
    getMostWishlistedTrips(limit?: number): Promise<({
        agency: {
            id: string;
            companyName: string;
            logo: string;
        };
    } & {
        description: string;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        exclusions: string[];
        checklist: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
        averageRating: number | null;
        reviewCount: number;
        lastReviewDate: Date | null;
        cancellationPolicy: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
        minBookings: number;
    })[]>;
}
