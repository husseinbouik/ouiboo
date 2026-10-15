export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Decompression bomb ceilings (#191)
export const MAX_IMAGE_PIXELS = 50_000_000; // ~50MP: width x height must not exceed this
export const MAX_PDF_PAGES = 100;

// Upload intents (#191): separate public trip assets from private identity documents
export const UPLOAD_INTENTS = ['trip-asset', 'identity-document'] as const;
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
