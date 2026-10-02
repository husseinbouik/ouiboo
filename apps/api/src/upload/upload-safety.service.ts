import { BadRequestException, Injectable } from '@nestjs/common';
import {
    ALLOWED_MIME_TYPES,
    AllowedMimeType,
    BLOCKED_PDF_TOKENS,
    BLOCKED_UPLOAD_SIGNATURES,
    MAX_UPLOAD_SIZE_BYTES,
} from './upload.constants';

@Injectable()
export class UploadSafetyService {
    validate(file: Express.Multer.File): void {
        if (!file?.buffer?.length) {
            throw new BadRequestException('Uploaded file is empty');
        }

        if (!ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
            throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WEBP, GIF, PDF');
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            throw new BadRequestException('File too large. Max size: 5MB');
        }

        const detectedMimeType = this.detectMimeType(file.buffer);
        if (detectedMimeType !== file.mimetype) {
            throw new BadRequestException('File content does not match the declared file type');
        }

        this.rejectKnownUnsafePayloads(file.buffer, detectedMimeType);
    }

    private detectMimeType(buffer: Buffer): AllowedMimeType | null {
        if (this.startsWith(buffer, [0xff, 0xd8, 0xff])) {
            return 'image/jpeg';
        }

        if (this.startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
            return 'image/png';
        }

        if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
            return 'image/webp';
        }

        const gifHeader = buffer.subarray(0, 6).toString('ascii');
        if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
            return 'image/gif';
        }

        if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
            return 'application/pdf';
        }

        return null;
    }

    private rejectKnownUnsafePayloads(buffer: Buffer, mimeType: AllowedMimeType): void {
        const ascii = buffer.toString('latin1');
        const normalized = ascii.toLowerCase();

        if (BLOCKED_UPLOAD_SIGNATURES.some((signature) => normalized.includes(signature.toLowerCase()))) {
            throw new BadRequestException('Uploaded file failed content safety checks');
        }

        if (this.startsWith(buffer, [0x4d, 0x5a])) {
            throw new BadRequestException('Executable uploads are not allowed');
        }

        if (mimeType === 'application/pdf') {
            const hasActivePdfContent = BLOCKED_PDF_TOKENS.some((token) => normalized.includes(token.toLowerCase()));
            if (hasActivePdfContent) {
                throw new BadRequestException('PDFs with active content or embedded files are not allowed');
            }
        }
    }

    private startsWith(buffer: Buffer, bytes: number[]): boolean {
        return bytes.every((byte, index) => buffer[index] === byte);
    }
}
