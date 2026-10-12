import { Readable } from 'node:stream';
import { BadRequestException } from '@nestjs/common';
import { UploadSafetyService } from './upload-safety.service';

const file = (overrides: Partial<Express.Multer.File>): Express.Multer.File => {
    const buffer = overrides.buffer ?? Buffer.from([]);
    return {
        fieldname: 'file',
        originalname: overrides.originalname ?? 'proof.png',
        encoding: '7bit',
        mimetype: overrides.mimetype ?? 'image/png',
        size: overrides.size ?? buffer.length,
        buffer,
        destination: '',
        filename: '',
        path: '',
        stream: Readable.from(buffer),
    };
};

const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000064000000640802000000', 'hex'); // 100x100
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF', 'latin1');

// Minimal JPEG: SOI + SOF0 (100x100) — enough for the dimension parser
const jpeg100 = Buffer.from([
    0xff, 0xd8,                         // SOI
    0xff, 0xc0, 0x00, 0x0b, 0x08,        // SOF0, length 11, precision 8
    0x00, 0x64, 0x00, 0x64,              // height 100, width 100
    0x01, 0x01, 0x11, 0x00,              // components (ignored)
    0xff, 0xd9,                         // EOI
]);
// Minimal JPEG SOF0 declaring 10000x10000 (100M pixels > 50M limit)
const jpegBomb = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    0x27, 0x10, 0x27, 0x10,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
]);

const gif100 = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.from([0x64, 0x00, 0x64, 0x00])]); // 100x100
const gifBomb = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.from([0x10, 0x27, 0x10, 0x27])]); // 10000x10000

// Minimal WebP VP8X declaring 100x100
const webp100 = (() => {
    const b = Buffer.alloc(30);
    b.write('RIFF', 0); b.write('WEBP', 8); b.write('VP8X', 12);
    b.writeUIntLE(99, 24, 3); b.writeUIntLE(99, 27, 3); // width-1, height-1
    return b;
})();
// Minimal WebP VP8X declaring 10000x10000
const webpBomb = (() => {
    const b = Buffer.alloc(30);
    b.write('RIFF', 0); b.write('WEBP', 8); b.write('VP8X', 12);
    b.writeUIntLE(9999, 24, 3); b.writeUIntLE(9999, 27, 3);
    return b;
})();

const pdfPage = (n: number) => `${n} 0 obj\n<< /Type /Page >>\nendobj\n`;
const pdfWithPages = (count: number) => {
    let body = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    body += '2 0 obj\n<< /Type /Pages /Count ' + count + ' >>\nendobj\n';
    for (let i = 0; i < count; i++) body += pdfPage(i + 3);
    return Buffer.from(body + '%%EOF', 'latin1');
};

describe('UploadSafetyService', () => {
    const service = new UploadSafetyService();

    it('accepts a valid file with a matching magic signature', () => {
        expect(() => service.validate(file({ buffer: png, mimetype: 'image/png' }))).not.toThrow();
    });

    it('rejects files whose content does not match the declared MIME type', () => {
        expect(() => service.validate(file({ buffer: png, mimetype: 'application/pdf' }))).toThrow(BadRequestException);
    });

    it('rejects known malware test signatures', () => {
        const eicarPdf = Buffer.from('%PDF-1.7\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*\n%%EOF', 'latin1');
        expect(() => service.validate(file({ buffer: eicarPdf, mimetype: 'application/pdf' }))).toThrow(BadRequestException);
    });

    it('rejects PDFs with active content or embedded files', () => {
        const activePdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /OpenAction 2 0 R /JavaScript 3 0 R >>\nendobj\n%%EOF', 'latin1');
        expect(() => service.validate(file({ buffer: activePdf, mimetype: 'application/pdf' }))).toThrow(BadRequestException);
    });

    it('accepts inert PDFs with a valid PDF header', () => {
        expect(() => service.validate(file({ buffer: pdf, mimetype: 'application/pdf' }))).not.toThrow();
    });

    describe('decompression bomb protection (#191)', () => {
        it('accepts a small JPEG', () => {
            expect(() => service.validate(file({ buffer: jpeg100, mimetype: 'image/jpeg', size: jpeg100.length }))).not.toThrow();
        });

        it('rejects a JPEG declaring 10000x10000 pixels', () => {
            expect(() => service.validate(file({ buffer: jpegBomb, mimetype: 'image/jpeg', size: jpegBomb.length }))).toThrow(BadRequestException);
        });

        it('rejects a JPEG with no parseable dimensions (fail closed)', () => {
            const noSof = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // SOI + EOI only
            expect(() => service.validate(file({ buffer: noSof, mimetype: 'image/jpeg', size: noSof.length }))).toThrow(BadRequestException);
        });

        it('accepts a small GIF', () => {
            expect(() => service.validate(file({ buffer: gif100, mimetype: 'image/gif', size: gif100.length }))).not.toThrow();
        });

        it('rejects a GIF declaring 10000x10000 pixels', () => {
            expect(() => service.validate(file({ buffer: gifBomb, mimetype: 'image/gif', size: gifBomb.length }))).toThrow(BadRequestException);
        });

        it('rejects a PNG declaring 10000x10000 pixels', () => {
            const bomb = Buffer.from('89504e470d0a1a0a0000000d4948445200002710000027100802000000', 'hex');
            expect(() => service.validate(file({ buffer: bomb, mimetype: 'image/png', size: bomb.length }))).toThrow(BadRequestException);
        });

        it('accepts a small WebP', () => {
            expect(() => service.validate(file({ buffer: webp100, mimetype: 'image/webp', size: webp100.length }))).not.toThrow();
        });

        it('rejects a WebP declaring 10000x10000 pixels', () => {
            expect(() => service.validate(file({ buffer: webpBomb, mimetype: 'image/webp', size: webpBomb.length }))).toThrow(BadRequestException);
        });

        it('accepts a PDF with few pages', () => {
            const few = pdfWithPages(3);
            expect(() => service.validate(file({ buffer: few, mimetype: 'application/pdf', size: few.length }))).not.toThrow();
        });

        it('rejects a PDF with more than 100 pages', () => {
            const many = pdfWithPages(101);
            expect(() => service.validate(file({ buffer: many, mimetype: 'application/pdf', size: many.length }))).toThrow(BadRequestException);
        });

        it('does not count the /Pages tree root as a page', () => {
            // 100 real pages + 1 /Pages root must NOT trip the 100-page limit
            const hundred = pdfWithPages(100);
            expect(() => service.validate(file({ buffer: hundred, mimetype: 'application/pdf', size: hundred.length }))).not.toThrow();
        });
    });
});
