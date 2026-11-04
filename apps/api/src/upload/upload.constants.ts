export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Decompression bomb ceilings (#191)
export const MAX_IMAGE_PIXELS = 50_000_000; // ~50MP: width x height must not exceed this
export const MAX_PDF_PAGES = 100;

// Upload intents (#191): separate public trip assets from private identity documents
// #665 (Council S6): `payment-proof` joins the private family — a payment
// proof is a private financial document, never a public trip asset.
// `avatar` is the profile-bound public intent for non-agency callers:
// the file is attached to the caller's own profile, nothing else.
export const UPLOAD_INTENTS = ['trip-asset', 'identity-document', 'payment-proof', 'avatar', 'review-photo'] as const;

/** Intents whose files are stored privately and never get a public URL. */
export const PRIVATE_UPLOAD_INTENTS: readonly UploadIntent[] = ['identity-document', 'payment-proof', 'review-photo'];

/** #776: a review carries at most this many traveller photos. Each file
 * still obeys MAX_UPLOAD_SIZE_BYTES through the upload pipe. */
export const MAX_REVIEW_PHOTOS = 3;
export type UploadIntent = (typeof UPLOAD_INTENTS)[number];

// Private files live under this key prefix and are never served publicly
export const PRIVATE_FILE_PREFIX = 'private';

// Signed URL lifetime for private file access (#191)
export const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes
export const SIGNED_URL_TOKEN_PURPOSE = 'ouiboo-private-file';

export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_MIME_TYPES_REGEX = /^(image\/jpeg|image\/png|image\/webp|image\/gif|application\/pdf)$/;

export const BLOCKED_UPLOAD_SIGNATURES = [
    'EICAR-STANDARD-ANTIVIRUS-TEST-FILE',
];

export const BLOCKED_PDF_TOKENS = [
    '/AA',
    '/AcroForm',
    '/EmbeddedFile',
    '/JavaScript',
    '/JS',
    '/Launch',
    '/OpenAction',
    '/RichMedia',
    '/SubmitForm',
    '/XFA',
];
