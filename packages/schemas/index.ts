import { z } from "zod";
import {
    BookingPaymentStatus,
    BookingStatus,
    PayoutStatus,
    PaymentMethod,
    PaymentProvider,
    RefundStatus,
    SessionStatus,
    SubscriptionStatus,
    TripCategory,
    TripStatus,
    UserRole,
    VerificationStatus,
} from "@ouiboo/types";

export const DecimalStringSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal amount string");
export const DecimalInputSchema = z.union([
    DecimalStringSchema,
    z.number().finite().positive(),
]);

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.nativeEnum(UserRole),
    avatar: z.string().optional(),
});

export const AgencyProfileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    companyName: z.string().min(2, "Company name is required"),
    ice: z.string().regex(/^[0-9]{15}$/, "ICE must be 15 digits"),
    patente: z.string().min(5, "Patente is required"),
    rib: z.string().regex(/^[0-9]{24}$/, "RIB must be 24 digits"),
    verificationStatus: z.nativeEnum(VerificationStatus),
    bio: z.string().optional(),
    logo: z.string().optional(),
    subscriptionStatus: z.nativeEnum(SubscriptionStatus).optional(),
    trialEndsAt: z.string().datetime().optional(),
    subscriptionEndsAt: z.string().datetime().optional(),
});

export const ItineraryDaySchema = z.object({
    id: z.string(),
    templateId: z.string(),
    dayNumber: z.number().int().positive(),
    title: z.string().optional(),
    description: z.string(),
    activities: z.array(z.string()),
});

export const CreateItineraryDaySchema = ItineraryDaySchema.omit({
    id: true,
    templateId: true,
});

export const TripTemplateSchema = z.object({
    id: z.string(),
    agencyId: z.string(),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.nativeEnum(TripCategory),
    startLocation: z.string(),
    endLocation: z.string().optional(),
    durationDays: z.number().int().positive(),
    durationNights: z.number().int().nonnegative(),
    inclusions: z.array(z.string()),
    exclusions: z.array(z.string()),
    checklist: z.array(z.string()),
    images: z.array(z.string()).min(1, "At least one image is required"),
    itinerary: z.array(ItineraryDaySchema).optional(),
    status: z.nativeEnum(TripStatus),
    currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be an ISO 4217 code"),
    startingPrice: DecimalStringSchema.nullable().optional(),
    createdAt: z.string().datetime(),
});

export const CreateTripTemplateSchema = TripTemplateSchema.omit({
    id: true,
    agencyId: true,
    createdAt: true,
    startingPrice: true,
    itinerary: true,
}).extend({
    itinerary: z.array(CreateItineraryDaySchema).optional(),
});

export const TripSessionSchema = z.object({
    id: z.string(),
    templateId: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    price: DecimalStringSchema,
    deposit: DecimalStringSchema,
    totalSeats: z.number().int().positive(),
    availableSeats: z.number().int().nonnegative(),
    status: z.nativeEnum(SessionStatus),
    currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be an ISO 4217 code"),
});

export const CreateTripSessionSchema = TripSessionSchema.omit({
    id: true,
    availableSeats: true,
});

export const BookingSchema = z.object({
    id: z.string(),
    sessionId: z.string(),
    travelerId: z.string(),
    bookingDate: z.string().datetime(),
    status: z.nativeEnum(BookingStatus),
    totalAmount: DecimalStringSchema,
    guestsCount: z.number().int().positive(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    paymentStatus: z.nativeEnum(BookingPaymentStatus).optional(),
    paymentProofId: z.string().optional(),
    paymentProofUrl: z.string().optional(),
    fullName: z.string().optional(),
    phoneNumber: z.string().optional(),
    documentNumber: z.string().optional(),
    paymentGatewayTransactionId: z.string().optional(),
    paymentGatewayMetadata: z.record(z.string(), z.unknown()).optional(),
    cancelledAt: z.string().datetime().optional(),
    confirmedAt: z.string().datetime().optional(),
    refundAmount: DecimalStringSchema.optional(),
    refundStatus: z.nativeEnum(RefundStatus).optional(),
});

export const PaymentProofSchema = z.object({
    id: z.string(),
    bookingId: z.string(),
    imageUrl: z.string(),
    uploadedAt: z.string().datetime(),
    status: z.nativeEnum(VerificationStatus),
    rejectionReason: z.string().optional(),
});

export const PayoutRequestSchema = z.object({
    id: z.string(),
    agencyId: z.string(),
    amount: DecimalStringSchema,
    status: z.nativeEnum(PayoutStatus),
    requestedAt: z.string().datetime(),
    processedAt: z.string().datetime().optional(),
    bankDetails: z.string(),
});

export const PayoutDetailsSchema = PayoutRequestSchema.extend({
    agency: z.object({
        companyName: z.string(),
        id: z.string(),
        user: z.object({
            email: z.string().email().nullable().optional(),
        }).nullable().optional(),
    }),
});

export const BookingDetailsSchema = BookingSchema.extend({
    paymentProof: PaymentProofSchema.optional(),
    review: z.object({
        id: z.string(),
    }).optional(),
    traveler: z.object({
        email: z.string().email(),
        name: z.string().optional(),
    }),
    session: TripSessionSchema.extend({
        template: z.object({
            agency: z.object({
                companyName: z.string(),
                id: z.string(),
            }),
            agencyId: z.string(),
            id: z.string(),
            images: z.array(z.string()),
            startLocation: z.string(),
            title: z.string(),
        }),
    }),
});

export const InitiateGatewayPaymentSchema = z.object({
    amount: DecimalInputSchema,
    bookingId: z.string(),
    provider: z.nativeEnum(PaymentProvider),
    travelerEmail: z.string().email(),
    travelerName: z.string().min(2),
});
export const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const RegisterSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum([UserRole.Agency, UserRole.Traveler]),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateTripInput = z.infer<typeof CreateTripTemplateSchema>;
export type CreateTripSessionInput = z.infer<typeof CreateTripSessionSchema>;
