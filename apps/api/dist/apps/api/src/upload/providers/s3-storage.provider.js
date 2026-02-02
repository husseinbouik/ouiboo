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
exports.S3StorageProvider = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const path = require("path");
const upload_constants_1 = require("../upload.constants");
let S3StorageProvider = class S3StorageProvider {
    constructor() {
        this.bucket = process.env.S3_BUCKET;
        this.region = process.env.S3_REGION || 'us-east-1';
        if (!this.bucket) {
            throw new Error('S3_BUCKET environment variable is not defined');
        }
        this.s3Client = new client_s3_1.S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: !!process.env.S3_ENDPOINT,
        });
    }
    isLocal() { return false; }
    async upload(file, folder) {
        if (!upload_constants_1.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Invalid file type');
        }
        if (file.size > upload_constants_1.MAX_UPLOAD_SIZE_BYTES) {
            throw new common_1.BadRequestException('File too large');
        }
        const extension = path.extname(file.originalname);
        const filename = `${(0, crypto_1.randomUUID)()}${extension}`;
        const key = path.join(folder, filename).replace(/\\/g, '/');
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));
        const url = process.env.S3_PUBLIC_URL
            ? `${process.env.S3_PUBLIC_URL}/${key}`
            : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
        return { url, key };
    }
    async delete(key) {
        await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
    }
    getFilePath(key) {
        return process.env.S3_PUBLIC_URL
            ? `${process.env.S3_PUBLIC_URL}/${key}`
            : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
};
exports.S3StorageProvider = S3StorageProvider;
exports.S3StorageProvider = S3StorageProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], S3StorageProvider);
//# sourceMappingURL=s3-storage.provider.js.map