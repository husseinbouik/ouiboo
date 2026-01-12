import { Injectable, BadRequestException } from '@nestjs/common';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
    private readonly uploadDir = path.join(process.cwd(), 'uploads');
    private readonly allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf'
    ];
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

    constructor() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(file: Express.Multer.File, folder: string): Promise<{ url: string; key: string }> {
        // Validation
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WEBP, PDF');
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException('File too large. Max size: 5MB');
        }

        // Sanitize filename
        const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = sanitizedOriginal;

        // Create folder structure: uploads/{folder}
        // folder usually passed as: agencyId/YYYY-MM-DD
        const relativePath = path.join(folder);
        const fullPath = path.join(this.uploadDir, relativePath);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        const filePath = path.join(fullPath, filename);

        // Prevent path traversal
        if (!filePath.startsWith(this.uploadDir)) {
            throw new BadRequestException('Invalid filename');
        }

        fs.writeFileSync(filePath, file.buffer);

        const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
        // URL format: uploads/agencyId/date/filename
        // Windows path separator handling for URL
        const urlPath = path.join('uploads', relativePath, filename).split(path.sep).join('/');
        const url = `${baseUrl.replace('/api', '')}/${urlPath}`;

        return { url, key: path.join(relativePath, filename) };
    }

    async delete(key: string): Promise<void> {
        const filePath = path.join(this.uploadDir, key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
