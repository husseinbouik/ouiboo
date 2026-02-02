import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '../upload.constants';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
    private readonly uploadDir = path.join(process.cwd(), 'uploads');
    private readonly privateUploadDir = path.join(process.cwd(), 'private-uploads');
    private readonly allowedMimeTypes = ALLOWED_MIME_TYPES;
    private readonly maxFileSize = MAX_UPLOAD_SIZE_BYTES;
    private readonly privatePrefix = 'private';
    isLocal() { return true; }

    constructor() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
        if (!fs.existsSync(this.privateUploadDir)) {
            fs.mkdirSync(this.privateUploadDir, { recursive: true });
        }
    }

    async upload(file: Express.Multer.File, folder: string): Promise<{ url: string; key: string }> {
        // Validation
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WEBP, GIF, PDF');
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException('File too large. Max size: 5MB');
        }

        const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const extension = path.extname(sanitizedOriginal) || this.getExtensionForMimeType(file.mimetype);
        const filename = `${randomUUID()}${extension}`;

        // Create folder structure: uploads/{folder}
        // folder usually passed as: agencyId/YYYY-MM-DD
        const { baseDir, isPrivate, relative } = this.resolveTarget(folder);
        const relativePath = path.join(relative);
        const fullPath = path.join(baseDir, relativePath);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        const filePath = path.join(fullPath, filename);

        // Prevent path traversal
        if (!filePath.startsWith(baseDir)) {
            throw new BadRequestException('Invalid filename');
        }

        fs.writeFileSync(filePath, file.buffer);

        const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
        const url = isPrivate
            ? ''
            : `${baseUrl.replace('/api', '')}/${path.join('uploads', relativePath, filename).split(path.sep).join('/')}`;

        const keyPrefix = isPrivate ? this.privatePrefix : '';
        const key = path.join(keyPrefix, relativePath, filename);
        return { url, key };
    }

    async delete(key: string): Promise<void> {
        const filePath = this.getFilePath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    getFilePath(key: string): string {
        const { baseDir, relative } = this.resolveTarget(key);
        const filePath = path.join(baseDir, relative);

        if (!filePath.startsWith(baseDir)) {
            throw new BadRequestException('Invalid file path');
        }

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('File not found');
        }

        return filePath;
    }

    private resolveTarget(value: string) {
        const normalized = value.replace(/^[\\/]+/, '');
        const isPrivate = normalized === this.privatePrefix
            || normalized.startsWith(`${this.privatePrefix}/`)
            || normalized.startsWith(`${this.privatePrefix}${path.sep}`);
        const relative = isPrivate
            ? normalized.replace(new RegExp(`^${this.privatePrefix}[\\\\/]?`), '')
            : normalized;
        const baseDir = isPrivate ? this.privateUploadDir : this.uploadDir;
        return { baseDir, relative, isPrivate };
    }

    private getExtensionForMimeType(mimeType: string): string {
        switch (mimeType) {
            case 'image/jpeg':
                return '.jpg';
            case 'image/png':
                return '.png';
            case 'image/webp':
                return '.webp';
            case 'image/gif':
                return '.gif';
            case 'application/pdf':
                return '.pdf';
            default:
                return '';
        }
    }
}
