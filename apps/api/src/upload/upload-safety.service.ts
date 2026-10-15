import { BadRequestException, Injectable } from '@nestjs/common';
import {
    ALLOWED_MIME_TYPES,
    AllowedMimeType,
    BLOCKED_PDF_TOKENS,
    BLOCKED_UPLOAD_SIGNATURES,
    MAX_IMAGE_PIXELS,
    MAX_PDF_PAGES,
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
        this.rejectDecompressionBombs(file.buffer, detectedMimeType);
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

    /**
     * Decompression bomb protection (#191).
     * Reads image dimensions from file headers WITHOUT fully decoding the
     * image, and rejects files whose pixel count exceeds MAX_IMAGE_PIXELS.
     * For PDFs, counts page objects and rejects documents with too many pages.
     * Fails closed: if dimensions cannot be determined, the file is rejected.
     */
    private rejectDecompressionBombs(buffer: Buffer, mimeType: AllowedMimeType): void {
        if (mimeType === 'application/pdf') {
            const pageCount = this.countPdfPages(buffer);
            if (pageCount > MAX_PDF_PAGES) {
                throw new BadRequestException(`PDF has too many pages. Max pages: ${MAX_PDF_PAGES}`);
            }
            return;
        }

        const dimensions = this.getImageDimensions(buffer, mimeType);
        if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
            throw new BadRequestException('Could not determine image dimensions');
        }

        if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
            throw new BadRequestException('Image dimensions too large');
        }
    }

    private getImageDimensions(buffer: Buffer, mimeType: AllowedMimeType): { width: number; height: number } | null {
        switch (mimeType) {
            case 'image/png':
                return this.pngDimensions(buffer);
            case 'image/gif':
                return this.gifDimensions(buffer);
            case 'image/jpeg':
                return this.jpegDimensions(buffer);
            case 'image/webp':
                return this.webpDimensions(buffer);
            default:
                return null;
        }
    }

    private pngDimensions(buffer: Buffer): { width: number; height: number } | null {
        // 8-byte signature + 4-byte length + 4-byte 'IHDR' + width(4 BE) + height(4 BE)
        if (buffer.length < 24) return null;
        if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
        return {
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20),
        };
    }

    private gifDimensions(buffer: Buffer): { width: number; height: number } | null {
        // 6-byte header + width(2 LE) + height(2 LE)
        if (buffer.length < 10) return null;
        return {
            width: buffer.readUInt16LE(6),
            height: buffer.readUInt16LE(8),
        };
    }

    private jpegDimensions(buffer: Buffer): { width: number; height: number } | null {
        // Scan JPEG markers for a Start-Of-Frame segment (contains dimensions).
        // Stops at SOS (start of entropy-coded scan data) — dimensions must precede it.
        const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
        const STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);

        if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null; // SOI

        let i = 2;
        while (i + 1 < buffer.length) {
            if (buffer[i] !== 0xff) return null; // expected marker prefix
            // Skip fill bytes (0xFF padding is legal)
            while (i < buffer.length && buffer[i] === 0xff) i++;
            if (i >= buffer.length) return null;
            const marker = buffer[i];
            i++;

            if (marker === 0xd9 || marker === 0xda) return null; // EOI or SOS: no SOF found

            if (STANDALONE_MARKERS.has(marker)) continue;

            if (i + 1 >= buffer.length) return null;
            const length = buffer.readUInt16BE(i);
            if (length < 2) return null;

            if (SOF_MARKERS.has(marker)) {
                // SOF payload: precision(1) + height(2 BE) + width(2 BE) + ...
                if (i + 8 >= buffer.length) return null;
                return {
                    height: buffer.readUInt16BE(i + 3),
                    width: buffer.readUInt16BE(i + 5),
                };
            }

            i += length;
        }
        return null;
    }

    private webpDimensions(buffer: Buffer): { width: number; height: number } | null {
        // RIFF(4) + size(4) + WEBP(4) + chunk FourCC(4) + chunk size(4) + payload
        if (buffer.length < 30) return null;
        const chunk = buffer.toString('ascii', 12, 16);

        if (chunk === 'VP8 ') {
            // Lossy: 3-byte frame tag + 3-byte start code (9D 01 2A) + width(2 LE, 14 bits) + height(2 LE, 14 bits)
            if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
            return {
                width: buffer.readUInt16LE(26) & 0x3fff,
                height: buffer.readUInt16LE(28) & 0x3fff,
            };
        }

        if (chunk === 'VP8L') {
            // Lossless: 1-byte signature (0x2F) + 4 bytes packed: 14 bits width-1, 14 bits height-1
            if (buffer.length < 25 || buffer[20] !== 0x2f) return null;
            const bits = buffer.readUInt32LE(21);
            return {
                width: (bits & 0x3fff) + 1,
                height: ((bits >> 14) & 0x3fff) + 1,
            };
        }

        if (chunk === 'VP8X') {
            // Extended: flags(1) + reserved(3) + canvas width-1 (3 bytes LE) + canvas height-1 (3 bytes LE)
            return {
                width: buffer.readUIntLE(24, 3) + 1,
                height: buffer.readUIntLE(27, 3) + 1,
            };
        }

        return null;
    }

    /**
     * Heuristic PDF page count: counts `/Type /Page` object declarations.
     * The negative lookahead excludes `/Type /Pages` (the page tree root).
     * Simple buffer scan, no full PDF parse — a best-effort bomb heuristic.
     */
    private countPdfPages(buffer: Buffer): number {
        const ascii = buffer.toString('latin1');
        const matches = ascii.match(/\/Type\s*\/Page(?!s)/g);
        return matches ? matches.length : 0;
    }
}
