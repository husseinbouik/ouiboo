export declare class UploadService {
    private storageProvider;
    constructor();
    uploadFile(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        filename: string;
        size: number;
    }>;
    getFilePath(key: string): string;
}
