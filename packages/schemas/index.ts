import { z } from "zod";
import {
    AccommodationType,
    BETA_DESTINATIONS,
    BookingPaymentStatus,
    BookingStatus,
    ItineraryMeal,
    PaymentMethod,
    PaymentProvider,
    RefundStatus,
    SessionStatus,
    SubscriptionStatus,
    TravelLicenceType,
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
    rib: z.preprocess(
        (value) =>
            typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
        z
            .string()
            .regex(
                /^[A-Z]{2}[0-9]{22}$/,
                'RIB must be 24 characters: 2 letters followed by 22 digits',
            ),
    ),
    verificationStatus: z.nativeEnum(VerificationStatus),
    bio: z.string().optional(),
    logo: z.string().optional(),
    subscriptionStatus: z.nativeEnum(SubscriptionStatus).optional(),
    trialEndsAt: z.string().datetime().optional(),
    subscriptionEndsAt: z.string().datetime().optional(),
    // #371: legal identity + Law 11-16 travel licence (submitted by the
    // agency; licence status fields themselves are server-managed and are
    // not accepted from the client).
    legalName: z.string().optional(),
    rc: z.string().optional(),
    taxId: z.string().optional(),
    legalRepresentative: z.string().optional(),
    businessAddress: z.string().optional(),
    travelLicenceType: z.nativeEnum(TravelLicenceType).optional(),
    travelLicenceNumber: z.string().optional(),
    // Date (YYYY-MM-DD from the onboarding form) or full ISO datetime.
    licenceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid licence expiry date").optional(),
    // B4 (Council Session #2): licence issue date + issuing authority —
    // part of a complete licence submission (Law 31-08 seller block).
    // The empty string is the form's "not supplied" value (converted to
    // undefined on submit, like licenceExpiry's empty state) — it must
    // not fail validation, or agencies could not submit anything else
    // before filling it in. Completeness is enforced server-side.
    licenceIssuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid licence issue date").optional().or(z.literal('')),
    licenceIssuingAuthority: z.string().optional(),
});

export const ItineraryDaySchema = z.object({
    id: z.string(),
    templateId: z.string(),
    dayNumber: z.number().int().positive(),
    title: z.string().optional(),
    description: z.string(),
    activities: z.array(z.string()),
    // #676 (Council S6): language-neutral slice — all optional.
    distanceKm: z.number().nonnegative().max(10000).optional().nullable(),
    driveTimeMinutes: z.number().int().nonnegative().max(10080).optional().nullable(),
    mealsIncluded: z.array(z.nativeEnum(ItineraryMeal)).max(3).optional(),
    accommodationName: z.string().max(200).optional().nullable(),
    accommodationType: z.nativeEnum(AccommodationType).optional().nullable(),
});

/**
 * #676: structured meeting point { address, mapsUrl, pickupAvailable }
 * alongside startLocation. The address is a proper noun/address text —
 * never localised, never a language map.
 */
export const MeetingPointSchema = z.object({
    address: z.string().max(300).optional().nullable(),
    mapsUrl: z.string().url().max(1000).optional().nullable(),
    // No .default(): a Zod input/output divergence here breaks the
    // agency wizard's react-hook-form resolver typing.
    pickupAvailable: z.boolean().optional(),
});

/** #675: destination slugs come from the BETA_DESTINATIONS configuration. */
export const DestinationSlugSchema = z.enum(
    BETA_DESTINATIONS.map((d) => d.slug) as [string, ...string[]],
);

export const CreateItineraryDaySchema = ItineraryDaySchema.omit({
    id: true,
    templateId: true,
});

/**
 * #417 (Council P0-11): agency per-trip cancellation bands for
 * traveller-initiated cancellations. The semantic rules mirror the API
 * (cancellation.util): coverage must reach 0 days and thresholds must be
 * unique, so every cancellation timing resolves to exactly one band.
 * The platform floor (agency fault / minimum group not reached = 100%
 * refund) is not configurable and always overrides the bands.
 */
export const CancellationBandSchema = z.object({
    minDaysBeforeStart: z.number().int().min(0).max(365),
    refundPercent: z.number().int().min(0).max(100),
});

export const CancellationPolicySchema = z.object({
    bands: z.array(CancellationBandSchema).min(1).max(10).superRefine((bands, ctx) => {
        const thresholds = new Set<number>();
        for (const band of bands) {
            if (thresholds.has(band.minDaysBeforeStart)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate cancellation band for ${band.minDaysBeforeStart} days before the trip`,
                });
            }
            thresholds.add(band.minDaysBeforeStart);
        }
        if (!thresholds.has(0)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Add a band starting at 0 days so every cancellation timing is covered',
            });
        }
    }),
});

/**
 * #417: platform default bands, applied when a trip stores none.
 * Mirrors PLATFORM_DEFAULT_CANCELLATION_BANDS in the API
 * (apps/api/src/cancellation/cancellation.util.ts) — keep them in sync.
 */
export const PLATFORM_DEFAULT_CANCELLATION_BANDS: Array<z.infer<typeof CancellationBandSchema>> = [
    { minDaysBeforeStart: 30, refundPercent: 100 },
    { minDaysBeforeStart: 15, refundPercent: 75 },
    { minDaysBeforeStart: 7, refundPercent: 50 },
    { minDaysBeforeStart: 3, refundPercent: 25 },
    { minDaysBeforeStart: 0, refundPercent: 0 },
];

/**
 * #546: one language's trip title + description inside the translations
 * map. Entries may be partial (drafts, encouraged languages); the French
 * entry is kept complete by the canonical title/description fields and
 * the API's publish gate — not by this schema, so drafts stay saveable.
 */
/** #584 (phase 2): one itinerary day's text inside a language entry. */
export const TripTranslationDaySchema = z.object({
    dayNumber: z.number().int().positive().optional(),
    title: z.string().max(300).optional(),
    description: z.string().max(10000).optional(),
    activities: z.array(z.string().max(200)).max(30).optional(),
});

export const TripTranslationEntrySchema = z.object({
    title: z.string().max(300).optional(),
    description: z.string().max(10000).optional(),
    // #584 (phase 2): section content in this language.
    itinerary: z.array(TripTranslationDaySchema).max(60).optional(),
    inclusions: z.array(z.string().max(500)).max(100).optional(),
    exclusions: z.array(z.string().max(500)).max(100).optional(),
    checklist: z.array(z.string().max(500)).max(100).optional(),
});

/** #546: language map keyed by ISO language code (fr/ar/en today, any future code by data). */
export const TripTranslationsSchema = z.record(z.string(), TripTranslationEntrySchema);

export const TripTemplateSchema = z.object({
    id: z.string(),
    agencyId: z.string(),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    // #546: multilingual title + description. `title`/`description` above
    // are the FRENCH text (required, canonical); translations carries the
    // other languages (Arabic/English encouraged, never blocking).
    translations: TripTranslationsSchema.optional(),
    category: z.nativeEnum(TripCategory),
    startLocation: z.string(),
    // #675: normalised destination (config slugs); omitted = derived
    // from startLocation by the API.
    destinationSlug: DestinationSlugSchema.optional().nullable(),
    // #676: structured meeting point alongside startLocation.
    meetingPoint: MeetingPointSchema.optional().nullable(),
    endLocation: z.string().optional(),
    durationDays: z.number().int().positive(),
    durationNights: z.number().int().nonnegative(),
    inclusions: z.array(z.string()),
    exclusions: z.array(z.string()),
    checklist: z.array(z.string()),
    images: z.array(z.string()).min(1, "At least one image is required"),
    // #332: optional alt text per image, aligned by index with `images`.
    imageAlts: z.array(z.string().max(300)).optional(),
    // #417: optional agency cancellation bands (absent = platform defaults).
    cancellationPolicy: CancellationPolicySchema.optional(),
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
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    role: z.enum([UserRole.Agency, UserRole.Traveler]),
});

export const ForgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const WaitlistSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        phoneNumber: z.string().min(8, "Phone number must be at least 8 characters"),
        userType: z.enum(["Agency", "Traveler"]),
        agencyName: z.string().optional(),
    })
    .refine((data) => data.userType !== "Agency" || !!data.agencyName?.trim(), {
        message: "Agency name is required",
        path: ["agencyName"],
    });

export const ResetPasswordSchema = z
    .object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type WaitlistInput = z.infer<typeof WaitlistSchema>;
export type CreateTripInput = z.infer<typeof CreateTripTemplateSchema>;
export type CreateTripSessionInput = z.infer<typeof CreateTripSessionSchema>;
