"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterSchema = exports.LoginSchema = exports.PayoutRequestSchema = exports.PaymentProofSchema = exports.BookingSchema = exports.CreateTripSessionSchema = exports.TripSessionSchema = exports.CreateTripTemplateSchema = exports.TripTemplateSchema = exports.CreateItineraryDaySchema = exports.ItineraryDaySchema = exports.AgencyProfileSchema = exports.UserSchema = void 0;
const zod_1 = require("zod");
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(["AGENCY", "TRAVELER", "ADMIN"]),
    avatar: zod_1.z.string().optional(),
});
exports.AgencyProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    companyName: zod_1.z.string().min(2, "Company name is required"),
    ice: zod_1.z.string().regex(/^[0-9]{15}$/, "ICE must be 15 digits"),
    patente: zod_1.z.string().min(5, "Patente is required"),
    rib: zod_1.z.string().regex(/^[0-9]{24}$/, "RIB must be 24 digits"),
    verificationStatus: zod_1.z.enum(["PENDING", "VERIFIED", "REJECTED"]),
    bio: zod_1.z.string().optional(),
    logo: zod_1.z.string().optional(),
});
exports.ItineraryDaySchema = zod_1.z.object({
    id: zod_1.z.string(),
    templateId: zod_1.z.string(),
    dayNumber: zod_1.z.number().int().positive(),
    title: zod_1.z.string().optional(),
    description: zod_1.z.string(),
    activities: zod_1.z.array(zod_1.z.string()),
});
exports.CreateItineraryDaySchema = exports.ItineraryDaySchema.omit({
    id: true,
    templateId: true,
});
exports.TripTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    agencyId: zod_1.z.string(),
    title: zod_1.z.string().min(3, "Title must be at least 3 characters"),
    description: zod_1.z.string().min(10, "Description must be at least 10 characters"),
    category: zod_1.z.enum(["ADVENTURE", "CULTURAL", "LUXURY", "BUDGET"]),
    startLocation: zod_1.z.string(),
    durationDays: zod_1.z.number().int().positive(),
    durationNights: zod_1.z.number().int().nonnegative(),
    inclusions: zod_1.z.array(zod_1.z.string()),
    images: zod_1.z.array(zod_1.z.string()).min(1, "At least one image is required"),
    itinerary: zod_1.z.array(exports.ItineraryDaySchema).optional(),
    status: zod_1.z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
    createdAt: zod_1.z.string().datetime(),
});
exports.CreateTripTemplateSchema = exports.TripTemplateSchema.omit({
    id: true,
    agencyId: true,
    createdAt: true,
    itinerary: true,
}).extend({
    itinerary: zod_1.z.array(exports.CreateItineraryDaySchema).optional(),
});
exports.TripSessionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    templateId: zod_1.z.string(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    price: zod_1.z.number().positive(),
    totalSeats: zod_1.z.number().int().positive(),
    availableSeats: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.enum(["OPEN", "CLOSED", "CANCELLED"]),
});
exports.CreateTripSessionSchema = exports.TripSessionSchema.omit({
    id: true,
    availableSeats: true,
});
exports.BookingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    travelerId: zod_1.z.string(),
    bookingDate: zod_1.z.string().datetime(),
    status: zod_1.z.enum(["Pending", "Confirmed", "Cancelled", "Completed", "PendingPayment"]),
    totalAmount: zod_1.z.number().positive(),
    guestsCount: zod_1.z.number().int().positive(),
    paymentProofId: zod_1.z.string().optional(),
});
exports.PaymentProofSchema = zod_1.z.object({
    id: zod_1.z.string(),
    bookingId: zod_1.z.string(),
    imageUrl: zod_1.z.string(),
    uploadedAt: zod_1.z.string().datetime(),
    status: zod_1.z.enum(["Pending", "Verified", "Rejected"]),
});
exports.PayoutRequestSchema = zod_1.z.object({
    id: zod_1.z.string(),
    agencyId: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
    status: zod_1.z.enum(["Pending", "Approved", "Rejected", "Paid"]),
    requestedAt: zod_1.z.string().datetime(),
    processedAt: zod_1.z.string().datetime().optional(),
    bankDetails: zod_1.z.string(),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
});
exports.RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    role: zod_1.z.enum(["AGENCY", "TRAVELER"]),
});
