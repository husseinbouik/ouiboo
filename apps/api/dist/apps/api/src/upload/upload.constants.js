"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_MIME_TYPES_REGEX = exports.ALLOWED_MIME_TYPES = exports.MAX_UPLOAD_SIZE_BYTES = void 0;
exports.MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
exports.ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
];
exports.ALLOWED_MIME_TYPES_REGEX = 'image/.*|application/pdf';
//# sourceMappingURL=upload.constants.js.map