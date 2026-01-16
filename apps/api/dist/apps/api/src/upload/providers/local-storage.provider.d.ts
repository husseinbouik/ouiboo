import { IStorageProvider } from '../interfaces/storage-provider.interface';
export declare class LocalStorageProvider implements IStorageProvider {
    private readonly uploadDir;
    private readonly allowedMimeTypes;
    private readonly maxFileSize;
    constructor();
    upload(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        key: string;
    }>;
    delete(key: string): Promise<void>;
    getFilePath(key: string): string;
    private getExtensionForMimeType;
}
