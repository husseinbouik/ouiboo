export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
