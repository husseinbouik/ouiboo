"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
let UploadService = class UploadService {
    constructor() {
        this.initializeProvider();
    }
    async initializeProvider() {
        const provider = process.env.STORAGE_PROVIDER || 'local';
        if (provider === 's3') {
            const { S3StorageProvider } = await Promise.resolve().then(() => require('./providers/s3-storage.provider'));
            this.storageProvider = new S3StorageProvider();
        }
        else {
            const { LocalStorageProvider } = await Promise.resolve().then(() => require('./providers/local-storage.provider'));
            this.storageProvider = new LocalStorageProvider();
        }
        console.log(`[UploadService] Initialized with ${provider} storage provider`);
    }
    async uploadFile(file, folder) {
        const result = await this.storageProvider.upload(file, folder);
        return {
            url: result.url,
            filename: result.key,
            size: file.size,
        };
    }
    getFilePath(key) {
        return this.storageProvider.getFilePath(key);
    }
    isLocal() {
        return this.storageProvider.isLocal();
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UploadService);
//# sourceMappingURL=upload.service.js.map