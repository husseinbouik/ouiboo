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
exports.LocalStorageProvider = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const crypto_1 = require("crypto");
const upload_constants_1 = require("../upload.constants");
let LocalStorageProvider = class LocalStorageProvider {
    constructor() {
        this.uploadDir = path.join(process.cwd(), 'uploads');
        this.allowedMimeTypes = upload_constants_1.ALLOWED_MIME_TYPES;
        this.maxFileSize = upload_constants_1.MAX_UPLOAD_SIZE_BYTES;
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    async upload(file, folder) {
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Invalid file type. Allowed: JPG, PNG, WEBP, GIF, PDF');
        }
        if (file.size > this.maxFileSize) {
            throw new common_1.BadRequestException('File too large. Max size: 5MB');
        }
        const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const extension = path.extname(sanitizedOriginal) || this.getExtensionForMimeType(file.mimetype);
        const filename = `${(0, crypto_1.randomUUID)()}${extension}`;
        const relativePath = path.join(folder);
        const fullPath = path.join(this.uploadDir, relativePath);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        const filePath = path.join(fullPath, filename);
        if (!filePath.startsWith(this.uploadDir)) {
            throw new common_1.BadRequestException('Invalid filename');
        }
        fs.writeFileSync(filePath, file.buffer);
        const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
        const urlPath = path.join('uploads', relativePath, filename).split(path.sep).join('/');
        const url = `${baseUrl.replace('/api', '')}/${urlPath}`;
        return { url, key: path.join(relativePath, filename) };
    }
    async delete(key) {
        const filePath = this.getFilePath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    getFilePath(key) {
        const filePath = path.join(this.uploadDir, key);
        if (!filePath.startsWith(this.uploadDir)) {
            throw new common_1.BadRequestException('Invalid file path');
        }
        if (!fs.existsSync(filePath)) {
            throw new common_1.NotFoundException('File not found');
        }
        return filePath;
    }
    getExtensionForMimeType(mimeType) {
        switch (mimeType) {
            case 'image/jpeg':
                return '.jpg';
            case 'image/png':
                return '.png';
            case 'image/webp':
                return '.webp';
            case 'image/gif':
                return '.gif';
            case 'application/pdf':
                return '.pdf';
            default:
                return '';
        }
    }
};
exports.LocalStorageProvider = LocalStorageProvider;
exports.LocalStorageProvider = LocalStorageProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LocalStorageProvider);
//# sourceMappingURL=local-storage.provider.js.map