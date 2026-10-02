import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { UploadSafetyService } from './upload-safety.service';

@Injectable()
export class UploadService {
    private storageProvider?: IStorageProvider;
    private initialization: Promise<void>;

    constructor(private readonly uploadSafetyService: UploadSafetyService) {
        this.initialization = this.initializeProvider();
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
        this.uploadSafetyService.validate(file);

        const provider = await this.getStorageProvider();
        const result = await provider.upload(file, folder);

        return {
            url: result.url,
            filename: result.key,
            size: file.size,
        };
    }

    async getFilePath(key: string) {
        const provider = await this.getStorageProvider();
        return provider.getFilePath(key);
    }

    async readFile(key: string) {
        const provider = await this.getStorageProvider();
        return provider.read(key);
    }

    async isLocal() {
        const provider = await this.getStorageProvider();
        return provider.isLocal();
    }

    private async getStorageProvider() {
        await this.initialization;
        if (!this.storageProvider) {
            throw new ServiceUnavailableException('Storage provider is not initialized');
        }
        return this.storageProvider;
    }
}
