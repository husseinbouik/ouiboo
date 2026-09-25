export interface IStorageProvider {
    upload(file: Express.Multer.File, folder: string): Promise<{ url: string; key: string }>;
    delete(key: string): Promise<void>;
    getFilePath(key: string): string;
    read(key: string): Promise<{ data: Buffer; contentType: string }>;
    isLocal(): boolean;
}
