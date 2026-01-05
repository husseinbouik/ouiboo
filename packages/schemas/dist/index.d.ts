import { z } from "zod";
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["AGENCY", "TRAVELER", "ADMIN"]>;
    avatar: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    role: "AGENCY" | "TRAVELER" | "ADMIN";
    email: string;
    avatar?: string | undefined;
}, {
    name: string;
    id: string;
    role: "AGENCY" | "TRAVELER" | "ADMIN";
    email: string;
    avatar?: string | undefined;
}>;
export declare const AgencyProfileSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    companyName: z.ZodString;
    ice: z.ZodString;
    patente: z.ZodString;
    rib: z.ZodString;
    verificationStatus: z.ZodEnum<["PENDING", "VERIFIED", "REJECTED"]>;
    bio: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    companyName: string;
    ice: string;
    patente: string;
    rib: string;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    bio?: string | undefined;
    logo?: string | undefined;
}, {
    id: string;
    userId: string;
    companyName: string;
    ice: string;
    patente: string;
    rib: string;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    bio?: string | undefined;
    logo?: string | undefined;
}>;
export declare const TripTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    agencyId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["ADVENTURE", "CULTURAL", "LUXURY", "BUDGET"]>;
    startLocation: z.ZodString;
    durationDays: z.ZodNumber;
    durationNights: z.ZodNumber;
    inclusions: z.ZodArray<z.ZodString, "many">;
    images: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["ACTIVE", "DRAFT", "ARCHIVED"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    description: string;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED";
    agencyId: string;
    category: "ADVENTURE" | "CULTURAL" | "LUXURY" | "BUDGET";
    startLocation: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    images: string[];
    createdAt: string;
}, {
    id: string;
    title: string;
    description: string;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED";
    agencyId: string;
    category: "ADVENTURE" | "CULTURAL" | "LUXURY" | "BUDGET";
    startLocation: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    images: string[];
    createdAt: string;
}>;
export declare const CreateTripTemplateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    agencyId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["ADVENTURE", "CULTURAL", "LUXURY", "BUDGET"]>;
    startLocation: z.ZodString;
    durationDays: z.ZodNumber;
    durationNights: z.ZodNumber;
    inclusions: z.ZodArray<z.ZodString, "many">;
    images: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["ACTIVE", "DRAFT", "ARCHIVED"]>;
    createdAt: z.ZodString;
}, "id" | "agencyId" | "createdAt">, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED";
    category: "ADVENTURE" | "CULTURAL" | "LUXURY" | "BUDGET";
    startLocation: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    images: string[];
}, {
    title: string;
    description: string;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED";
    category: "ADVENTURE" | "CULTURAL" | "LUXURY" | "BUDGET";
    startLocation: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    images: string[];
}>;
export declare const TripSessionSchema: z.ZodObject<{
    id: z.ZodString;
    templateId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    price: z.ZodNumber;
    totalSeats: z.ZodNumber;
    availableSeats: z.ZodNumber;
    status: z.ZodEnum<["OPEN", "CLOSED", "CANCELLED"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "OPEN" | "CLOSED" | "CANCELLED";
    templateId: string;
    startDate: string;
    endDate: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
}, {
    id: string;
    status: "OPEN" | "CLOSED" | "CANCELLED";
    templateId: string;
    startDate: string;
    endDate: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
}>;
export declare const CreateTripSessionSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    templateId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    price: z.ZodNumber;
    totalSeats: z.ZodNumber;
    availableSeats: z.ZodNumber;
    status: z.ZodEnum<["OPEN", "CLOSED", "CANCELLED"]>;
}, "id" | "availableSeats">, "strip", z.ZodTypeAny, {
    status: "OPEN" | "CLOSED" | "CANCELLED";
    templateId: string;
    startDate: string;
    endDate: string;
    price: number;
    totalSeats: number;
}, {
    status: "OPEN" | "CLOSED" | "CANCELLED";
    templateId: string;
    startDate: string;
    endDate: string;
    price: number;
    totalSeats: number;
}>;
export declare const BookingSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    travelerId: z.ZodString;
    bookingDate: z.ZodString;
    status: z.ZodEnum<["Pending", "Confirmed", "Cancelled", "Completed", "PendingPayment"]>;
    totalAmount: z.ZodNumber;
    guestsCount: z.ZodNumber;
    paymentProofId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "Pending" | "Confirmed" | "Cancelled" | "Completed" | "PendingPayment";
    sessionId: string;
    travelerId: string;
    bookingDate: string;
    totalAmount: number;
    guestsCount: number;
    paymentProofId?: string | undefined;
}, {
    id: string;
    status: "Pending" | "Confirmed" | "Cancelled" | "Completed" | "PendingPayment";
    sessionId: string;
    travelerId: string;
    bookingDate: string;
    totalAmount: number;
    guestsCount: number;
    paymentProofId?: string | undefined;
}>;
export declare const PaymentProofSchema: z.ZodObject<{
    id: z.ZodString;
    bookingId: z.ZodString;
    imageUrl: z.ZodString;
    uploadedAt: z.ZodString;
    status: z.ZodEnum<["Pending", "Verified", "Rejected"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "Pending" | "Verified" | "Rejected";
    bookingId: string;
    imageUrl: string;
    uploadedAt: string;
}, {
    id: string;
    status: "Pending" | "Verified" | "Rejected";
    bookingId: string;
    imageUrl: string;
    uploadedAt: string;
}>;
export declare const PayoutRequestSchema: z.ZodObject<{
    id: z.ZodString;
    agencyId: z.ZodString;
    amount: z.ZodNumber;
    status: z.ZodEnum<["Pending", "Approved", "Rejected", "Paid"]>;
    requestedAt: z.ZodString;
    processedAt: z.ZodOptional<z.ZodString>;
    bankDetails: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "Pending" | "Rejected" | "Approved" | "Paid";
    agencyId: string;
    amount: number;
    requestedAt: string;
    bankDetails: string;
    processedAt?: string | undefined;
}, {
    id: string;
    status: "Pending" | "Rejected" | "Approved" | "Paid";
    agencyId: string;
    amount: number;
    requestedAt: string;
    bankDetails: string;
    processedAt?: string | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const RegisterSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<["AGENCY", "TRAVELER"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: "AGENCY" | "TRAVELER";
    email: string;
    password: string;
}, {
    name: string;
    role: "AGENCY" | "TRAVELER";
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateTripInput = z.infer<typeof CreateTripTemplateSchema>;
export type CreateTripSessionInput = z.infer<typeof CreateTripSessionSchema>;
