import { Injectable, BadRequestException } from '@nestjs/common';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '../upload.constants';

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
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type');
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            throw new BadRequestException('File too large');
        }

        const extension = path.extname(file.originalname);
        const filename = `${randomUUID()}${extension}`;
        const key = path.join(folder, filename).replace(/\\/g, '/');

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
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
                Key: key,
            }),
        );
    }

    getFilePath(key: string): string {
        // Return public URL or key. For S3, we use this in redirection.
        return process.env.S3_PUBLIC_URL
            ? `${process.env.S3_PUBLIC_URL}/${key}`
            : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
}
