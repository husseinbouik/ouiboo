import { DatabaseService } from '../database/database.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: DatabaseService);
    createReview(bookingId: string, travelerId: string, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        travelerId: string;
        bookingId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
    getReviewsByTrip(tripId: string, page?: number, limit?: number): Promise<{
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
            travelerId: string;
            bookingId: string;
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
    respondToReview(reviewId: string, agencyId: string, dto: ReviewResponseDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        travelerId: string;
        bookingId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
    updateReview(reviewId: string, travelerId: string, dto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        travelerId: string;
        bookingId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
    deleteReview(reviewId: string, userId: string, userRole: string): Promise<void>;
    moderateReview(reviewId: string, action: 'approve' | 'reject'): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        travelerId: string;
        bookingId: string;
        tripTemplateId: string;
        comment: string | null;
        response: string | null;
        isVerifiedBooking: boolean;
    }>;
    private updateTripRating;
}
