import { Injectable } from '@nestjs/common';
import { IStorageProvider } from './interfaces/storage-provider.interface';
// Dynamic imports used in constructor to avoid missing dependency errors

@Injectable()
export class UploadService {
    private storageProvider: IStorageProvider;

    constructor() {
        this.initializeProvider();
    }

    private async initializeProvider() {
        const provider = process.env.STORAGE_PROVIDER || 'local';

        if (provider === 's3') {
            const { S3StorageProvider } = await import('./providers/s3-storage.provider');
            this.storageProvider = new S3StorageProvider();
        } else {
            const { LocalStorageProvider } = await import('./providers/local-storage.provider');
            this.storageProvider = new LocalStorageProvider();
        }

        console.log(`[UploadService] Initialized with ${provider} storage provider`);
    }

    async uploadFile(file: Express.Multer.File, folder: string) {
        const result = await this.storageProvider.upload(file, folder);

        return {
            url: result.url,
            filename: result.key,
            size: file.size,
        };
    }

    getFilePath(key: string) {
        return this.storageProvider.getFilePath(key);
    }

    isLocal() {
        return this.storageProvider.isLocal();
    }
}
