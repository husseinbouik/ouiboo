import { Injectable, BadRequestException } from '@nestjs/common';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { ALLOWED_MIME_TYPES, AllowedMimeType, MAX_UPLOAD_SIZE_BYTES } from '../upload.constants';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly region: string;

    constructor() {
        this.bucket = process.env.S3_BUCKET;
        this.region = process.env.S3_REGION || 'us-east-1';

        if (!this.bucket) {
            throw new Error('S3_BUCKET environment variable is not defined');
        }

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: !!process.env.S3_ENDPOINT,
        });
    }

    isLocal() { return false; }

    async upload(file: Express.Multer.File, folder: string): Promise<{ url: string; key: string }> {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
            throw new BadRequestException('Invalid file type');
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            throw new BadRequestException('File too large');
        }

        const extension = this.getExtensionForMimeType(file.mimetype);
        const filename = `${randomUUID()}${extension}`;
        const key = path.posix.join(this.normalizeStorageKey(folder), filename);

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ServerSideEncryption: 'AES256',
            }),
        );

        const url = process.env.S3_PUBLIC_URL
            ? `${process.env.S3_PUBLIC_URL}/${key}`
            : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

        return { url, key };
    }

    async delete(key: string): Promise<void> {
        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: this.normalizeStorageKey(key),
            }),
        );
    }

    getFilePath(key: string): string {
        const safeKey = this.normalizeStorageKey(key);
        return process.env.S3_PUBLIC_URL
            ? `${process.env.S3_PUBLIC_URL}/${safeKey}`
            : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${safeKey}`;
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
