import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ALLOWED_MIME_TYPES, AllowedMimeType, MAX_UPLOAD_SIZE_BYTES } from '../upload.constants';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
    private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
    private readonly privateUploadDir = path.resolve(process.cwd(), 'private-uploads');
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
        if (!this.allowedMimeTypes.includes(file.mimetype as AllowedMimeType)) {
            throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WEBP, GIF, PDF');
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException('File too large. Max size: 5MB');
        }

        const extension = this.getExtensionForMimeType(file.mimetype);
        const filename = `${randomUUID()}${extension}`;
        const { baseDir, isPrivate, relative } = this.resolveTarget(folder);
        const fullPath = this.resolveUnderBase(baseDir, relative);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        const filePath = this.resolveUnderBase(fullPath, filename);
        fs.writeFileSync(filePath, file.buffer);

        const baseUrl = process.env.API_URL || 'http://localhost:3010/api/v1';
        const publicOrigin = new URL(baseUrl).origin;
        const publicPath = path.posix.join('uploads', relative.replace(/\\/g, '/'), filename);
        const url = isPrivate ? '' : `${publicOrigin}/${publicPath}`;
        const key = isPrivate
            ? path.posix.join(this.privatePrefix, relative.replace(/\\/g, '/'), filename)
            : path.posix.join(relative.replace(/\\/g, '/'), filename);

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
        const filePath = this.resolveUnderBase(baseDir, relative);

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('File not found');
        }

        return filePath;
    }

    async read(key: string): Promise<{ data: Buffer; contentType: string }> {
        const filePath = this.getFilePath(key);
        return {
            data: fs.readFileSync(filePath),
            contentType: this.contentTypeForExtension(filePath),
        };
    }

    private contentTypeForExtension(filePath: string): string {
        switch (path.extname(filePath).toLowerCase()) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.webp':
                return 'image/webp';
            case '.gif':
                return 'image/gif';
            case '.pdf':
                return 'application/pdf';
            default:
                return 'application/octet-stream';
        }
    }

    private resolveTarget(value: string) {
        const normalized = this.normalizeStorageKey(value);
        const isPrivate = normalized === this.privatePrefix || normalized.startsWith(`${this.privatePrefix}/`);
        const relative = isPrivate ? normalized.replace(new RegExp(`^${this.privatePrefix}/?`), '') : normalized;
        const baseDir = isPrivate ? this.privateUploadDir : this.uploadDir;
        return { baseDir, relative, isPrivate };
    }

    private normalizeStorageKey(value: string): string {
        const normalized = (value || '').replace(/\\/g, '/').replace(/^\/+/, '');
        const segments = normalized.split('/').filter(Boolean);

        for (const segment of segments) {
            if (segment === '.' || segment === '..' || path.isAbsolute(segment) || !/^[a-zA-Z0-9._-]+$/.test(segment)) {
                throw new BadRequestException('Invalid upload path');
            }
        }

        return segments.join('/');
    }

    private resolveUnderBase(baseDir: string, relativePath: string): string {
        const fullPath = path.resolve(baseDir, relativePath);
        const relativeFromBase = path.relative(baseDir, fullPath);

        if (relativeFromBase.startsWith('..') || path.isAbsolute(relativeFromBase)) {
            throw new BadRequestException('Invalid upload path');
        }

        return fullPath;
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
