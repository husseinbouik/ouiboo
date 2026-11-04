export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Decompression bomb ceilings (#191)
export const MAX_IMAGE_PIXELS = 50_000_000; // ~50MP: width x height must not exceed this
export const MAX_PDF_PAGES = 100;

// Upload intents (#191): separate public trip assets from private identity documents
// #665 (Council S6): `payment-proof` joins the private family — a payment
// proof is a private financial document, never a public trip asset.
// `avatar` is the profile-bound public intent for non-agency callers:
// the file is attached to the caller's own profile, nothing else.
export const UPLOAD_INTENTS = ['trip-asset', 'identity-document', 'payment-proof', 'avatar', 'review-photo', 'review-video'] as const;

/** Intents whose files are stored privately and never get a public URL. */
export const PRIVATE_UPLOAD_INTENTS: readonly UploadIntent[] = ['identity-document', 'payment-proof', 'review-photo', 'review-video'];

/** #776: a review carries at most this many traveller photos. Each file
 * still obeys MAX_UPLOAD_SIZE_BYTES through the upload pipe. */
export const MAX_REVIEW_PHOTOS = 3;

/** #783: a review carries at most ONE traveller video, through the
 * private `review-video` intent only. Videos get their own mime
 * allowlist and a larger size cap than images — both enforced
 * server-side per intent (controller + safety service + providers),
 * never through the generic image pipe. */
export const MAX_REVIEW_VIDEOS = 1;
export const MAX_REVIEW_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const REVIEW_VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
] as const;
export type ReviewVideoMimeType = (typeof REVIEW_VIDEO_MIME_TYPES)[number];
export const REVIEW_VIDEO_MIME_TYPES_REGEX = /^(video\/mp4|video\/webm|video\/quicktime)$/;
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
    // #783: video types are in the platform-wide list ONLY so the
    // safety service and storage providers can handle them; the
    // upload controller restricts them to the `review-video` intent
    // (and restricts every other intent to non-video types), so a
    // video can never ride a public or document intent.
    'video/mp4',
    'video/webm',
    'video/quicktime',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_MIME_TYPES_REGEX = /^(image\/jpeg|image\/png|image\/webp|image\/gif|application\/pdf)$/;

/** Union pipe regex (images, PDF, review videos). Per-intent
 * enforcement happens in the upload controller + safety service:
 * the pipe only bounds the platform-wide maximum (50MB video cap). */
export const ALL_UPLOAD_MIME_TYPES_REGEX = /^(image\/jpeg|image\/png|image\/webp|image\/gif|application\/pdf|video\/mp4|video\/webm|video\/quicktime)$/;

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
