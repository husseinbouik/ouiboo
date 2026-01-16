import { Injectable } from '@nestjs/common';
import { LocalStorageProvider } from './providers/local-storage.provider';

@Injectable()
export class UploadService {
    private storageProvider: LocalStorageProvider;

    constructor() {
        this.storageProvider = new LocalStorageProvider();
    }

    async uploadFile(file: Express.Multer.File, folder: string) {
        // Delegate to secure storage provider
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
}
