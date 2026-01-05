import { z } from "zod";

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["AGENCY", "TRAVELER", "ADMIN"]),
    avatar: z.string().optional(),
});

export const AgencyProfileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    companyName: z.string().min(2, "Company name is required"),
    ice: z.string().regex(/^[0-9]{15}$/, "ICE must be 15 digits"),
    patente: z.string().min(5, "Patente is required"),
    rib: z.string().regex(/^[0-9]{24}$/, "RIB must be 24 digits"),
    verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
    bio: z.string().optional(),
    logo: z.string().optional(),
});

export const TripTemplateSchema = z.object({
    id: z.string(),
    agencyId: z.string(),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.enum(["ADVENTURE", "CULTURAL", "LUXURY", "BUDGET"]),
    startLocation: z.string(),
    durationDays: z.number().int().positive(),
    durationNights: z.number().int().nonnegative(),
    inclusions: z.array(z.string()),
    images: z.array(z.string()).min(1, "At least one image is required"),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
    createdAt: z.string().datetime(),
});

export const CreateTripTemplateSchema = TripTemplateSchema.omit({
    id: true,
    agencyId: true,
    createdAt: true,
});

export const TripSessionSchema = z.object({
    id: z.string(),
    templateId: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    price: z.number().positive(),
    totalSeats: z.number().int().positive(),
    availableSeats: z.number().int().nonnegative(),
    status: z.enum(["OPEN", "CLOSED", "CANCELLED"]),
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
    status: z.enum(["Pending", "Confirmed", "Cancelled", "Completed", "PendingPayment"]),
    totalAmount: z.number().positive(),
    guestsCount: z.number().int().positive(),
    paymentProofId: z.string().optional(),
});

export const PaymentProofSchema = z.object({
    id: z.string(),
    bookingId: z.string(),
    imageUrl: z.string(),
    uploadedAt: z.string().datetime(),
    status: z.enum(["Pending", "Verified", "Rejected"]),
});

export const PayoutRequestSchema = z.object({
    id: z.string(),
    agencyId: z.string(),
    amount: z.number().positive(),
    status: z.enum(["Pending", "Approved", "Rejected", "Paid"]),
    requestedAt: z.string().datetime(),
    processedAt: z.string().datetime().optional(),
    bankDetails: z.string(),
});
export const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const RegisterSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["AGENCY", "TRAVELER"]),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateTripInput = z.infer<typeof CreateTripTemplateSchema>;
export type CreateTripSessionInput = z.infer<typeof CreateTripSessionSchema>;
