import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';
export declare class ReviewsController {
    private reviewsService;
    constructor(reviewsService: ReviewsService);
    createReview(bookingId: string, dto: CreateReviewDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        bookingId: string;
        travelerId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
}
export declare class TripsReviewsController {
    private reviewsService;
    constructor(reviewsService: ReviewsService);
    getReviews(tripId: string, page?: string, limit?: string, sortBy?: string): Promise<{
        reviews: ({
            traveler: {
                name: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            bookingId: string;
            travelerId: string;
            tripTemplateId: string;
            comment: string | null;
            response: string | null;
            isVerifiedBooking: boolean;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    getReviewStats(tripId: string): Promise<{
        averageRating: number;
        totalReviews: number;
        distribution: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
        };
    }>;
}
export declare class ReviewDetailController {
    private reviewsService;
    constructor(reviewsService: ReviewsService);
    respondToReview(reviewId: string, dto: ReviewResponseDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        bookingId: string;
        travelerId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
    updateReview(reviewId: string, dto: UpdateReviewDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        bookingId: string;
        travelerId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
    deleteReview(reviewId: string, req: any): Promise<void>;
}
