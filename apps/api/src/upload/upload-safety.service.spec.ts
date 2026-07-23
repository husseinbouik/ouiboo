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

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF', 'latin1');

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
});
