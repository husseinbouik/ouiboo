import { IStorageProvider } from '../interfaces/storage-provider.interface';
export declare class LocalStorageProvider implements IStorageProvider {
    private readonly uploadDir;
    private readonly privateUploadDir;
    private readonly allowedMimeTypes;
    private readonly maxFileSize;
    private readonly privatePrefix;
    isLocal(): boolean;
    constructor();
    upload(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        key: string;
    }>;
    delete(key: string): Promise<void>;
    getFilePath(key: string): string;
    private resolveTarget;
    private getExtensionForMimeType;
}
