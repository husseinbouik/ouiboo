import { IStorageProvider } from '../interfaces/storage-provider.interface';
export declare class S3StorageProvider implements IStorageProvider {
    private readonly s3Client;
    private readonly bucket;
    private readonly region;
    constructor();
    isLocal(): boolean;
    upload(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        key: string;
    }>;
    delete(key: string): Promise<void>;
    getFilePath(key: string): string;
}
