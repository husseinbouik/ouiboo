export declare class UploadService {
    uploadFile(file: Express.Multer.File): Promise<{
        url: string;
        filename: string;
        size: number;
    }>;
}
