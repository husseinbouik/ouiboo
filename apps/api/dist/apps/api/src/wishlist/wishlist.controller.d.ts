import { WishlistService } from './wishlist.service';
export declare class WishlistController {
    private wishlistService;
    constructor(wishlistService: WishlistService);
    addToWishlist(tripId: string, req: any): Promise<{
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
    removeFromWishlist(tripId: string, req: any): Promise<{
        success: boolean;
    }>;
    getWishlist(page: string, limit: string, req: any): Promise<{
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
    isInWishlist(tripId: string, req: any): Promise<{
        isWishlisted: boolean;
    }>;
    getCount(req: any): Promise<{
        count: number;
    }>;
}
