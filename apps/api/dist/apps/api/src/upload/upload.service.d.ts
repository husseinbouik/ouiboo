export declare class UploadService {
    private storageProvider;
    constructor();
    private initializeProvider;
    uploadFile(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        filename: string;
        size: number;
    }>;
    getFilePath(key: string): string;
    isLocal(): boolean;
}
