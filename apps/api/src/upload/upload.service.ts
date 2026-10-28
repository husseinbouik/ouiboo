import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { UploadSafetyService } from './upload-safety.service';
import { PRIVATE_FILE_PREFIX, SIGNED_URL_TOKEN_PURPOSE, SIGNED_URL_TTL_SECONDS } from './upload.constants';
import { derivePublicMediaUrl } from './media-url.util';

export interface SignedUrlRequester {
    userId: string;
    role: string;
}

@Injectable()
export class UploadService {
    private storageProvider?: IStorageProvider;
    private initialization: Promise<void>;

    constructor(
        private readonly uploadSafetyService: UploadSafetyService,
        private readonly jwtService: JwtService,
    ) {
        this.initialization = this.initializeProvider();
    }

    private async initializeProvider() {
        const provider = process.env.STORAGE_PROVIDER || 'local';

        if (provider === 's3') {
            const { S3StorageProvider } = await import('./providers/s3-storage.provider');
            this.storageProvider = new S3StorageProvider();
        } else {
            const { LocalStorageProvider } = await import('./providers/local-storage.provider');
            this.storageProvider = new LocalStorageProvider();
        }

        console.log(`[UploadService] Initialized with ${provider} storage provider`);
    }

    async uploadFile(file: Express.Multer.File, folder: string) {
        this.uploadSafetyService.validate(file);

        const provider = await this.getStorageProvider();
        const result = await provider.upload(file, folder);

        return {
            url: result.url,
            filename: result.key,
            size: file.size,
        };
    }

    async getFilePath(key: string) {
        const provider = await this.getStorageProvider();
        return provider.getFilePath(key);
    }

    async readFile(key: string) {
        const provider = await this.getStorageProvider();
        return provider.read(key);
    }

    async isLocal() {
        const provider = await this.getStorageProvider();
        return provider.isLocal();
    }

    /**
     * Issues a short-lived signed URL for a private file (#191).
     * Only the file owner (private/{userId}/...) or an admin may obtain one.
     * Public files don't need signed URLs — they already have public URLs.
     */
    async createSignedFileUrl(key: string, requester: SignedUrlRequester): Promise<{ url: string; expiresAt: string }> {
        const safeKey = this.assertSafeKey(key);

        if (!this.isPrivateKey(safeKey)) {
            throw new BadRequestException('Signed URLs are only issued for private files');
        }

        const ownerId = safeKey.split('/')[1];
        const isOwner = !!ownerId && ownerId === requester.userId;
        const isAdmin = requester.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException('Access denied');
        }

        const token = await this.jwtService.signAsync(
            { key: safeKey, purpose: SIGNED_URL_TOKEN_PURPOSE },
            { expiresIn: SIGNED_URL_TTL_SECONDS },
        );

        return {
            url: `${this.apiOrigin()}/api/v1/upload/file?token=${token}`,
            expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
        };
    }

    /**
     * Resolves a signed file token back to the file bytes (#191).
     * The token itself is the credential: valid signature + purpose + expiry
     * is sufficient; no session is required.
     */
    async readPrivateFileByToken(token: string): Promise<{ data: Buffer; contentType: string; key: string }> {
        let payload: { key?: unknown; purpose?: unknown };
        try {
            payload = await this.jwtService.verifyAsync(token);
        } catch {
            throw new UnauthorizedException('Invalid or expired file token');
        }

        if (payload?.purpose !== SIGNED_URL_TOKEN_PURPOSE || typeof payload?.key !== 'string') {
            throw new UnauthorizedException('Invalid file token');
        }

        const safeKey = this.assertSafeKey(payload.key);
        if (!this.isPrivateKey(safeKey)) {
            throw new ForbiddenException('Access denied');
        }

        const provider = await this.getStorageProvider();
        try {
            const file = await provider.read(safeKey);
            return { ...file, key: safeKey };
        } catch {
            throw new NotFoundException('File not found');
        }
    }

    /**
     * Re-derives the public URL for a stored media reference against the
     * CURRENT public base (#447). Stored rows hold references (full URLs
     * minted under an older base, or raw keys); callers serving trip
     * images / agency logos must pass them through here (or the
     * media-url.util helpers) instead of returning the stored value.
     */
    toPublicMediaUrl(reference: string | null | undefined): string | null | undefined {
        return derivePublicMediaUrl(reference);
    }

    /**
     * Resolves a stored file reference back to its storage key (#251/B23).
     *
     * File references sit in the database in mixed shapes: raw keys
     * (`private/{userId}/…`, `trips/{agencyId}/…`) and public URLs minted
     * by the storage providers (`{S3_PUBLIC_URL}/{key}`,
     * `https://{bucket}.s3.{region}.amazonaws.com/{key}`,
     * `{origin}/api/v1/media/{key}`). API download URLs
     * (`{origin}/api/v1/bookings/{id}/payment-proof/file`) carry no key
     * and resolve to null, as do external URLs. Every platform key starts
     * with one of the two root folders, so the key is recovered from the
     * first matching path segment and re-validated as a safe key.
     */
    resolveStorageKey(reference: string | null | undefined): string | null {
        if (!reference) {
            return null;
        }
        const withoutQuery = reference.split(/[?#]/)[0];
        let decoded = withoutQuery;
        try {
            decoded = decodeURIComponent(withoutQuery);
        } catch {
            // Keep the raw value; the safe-key check below rejects garbage.
        }
        const normalized = decoded.replace(/\\/g, '/');
        for (const root of [`${PRIVATE_FILE_PREFIX}/`, 'trips/']) {
            const nestedAt = normalized.indexOf(`/${root}`);
            const candidate = nestedAt >= 0
                ? normalized.slice(nestedAt + 1)
                : normalized.startsWith(root)
                    ? normalized
                    : null;
            if (candidate) {
                try {
                    return this.assertSafeKey(candidate);
                } catch {
                    return null;
                }
            }
        }
        return null;
    }

    /**
     * Deletes a stored object by key. Both providers treat a missing key
     * as a no-op, so deletion is idempotent.
     */
    async deleteFile(key: string): Promise<void> {
        const safeKey = this.assertSafeKey(key);
        const provider = await this.getStorageProvider();
        await provider.delete(safeKey);
    }

    /**
     * Deletes the stored object a database file reference points at.
     * Returns true when a platform object deletion was requested.
     */
    async deleteFileByReference(reference: string | null | undefined): Promise<boolean> {
        const key = this.resolveStorageKey(reference);
        if (!key) {
            return false;
        }
        await this.deleteFile(key);
        return true;
    }

    private isPrivateKey(key: string): boolean {
        return key === PRIVATE_FILE_PREFIX || key.startsWith(`${PRIVATE_FILE_PREFIX}/`);
    }

    private assertSafeKey(key: string): string {
        const normalized = (key || '').replace(/\\/g, '/').replace(/^\/+/, '');
        const segments = normalized.split('/').filter(Boolean);
        if (!segments.length) {
            throw new BadRequestException('Invalid file key');
        }
        for (const segment of segments) {
            if (segment === '.' || segment === '..' || !/^[a-zA-Z0-9._-]+$/.test(segment)) {
                throw new BadRequestException('Invalid file key');
            }
        }
        return segments.join('/');
    }

    private apiOrigin(): string {
        const baseUrl = process.env.API_URL || 'http://localhost:3010/api/v1';
        return new URL(baseUrl).origin;
    }

    private async getStorageProvider() {
        await this.initialization;
        if (!this.storageProvider) {
            throw new ServiceUnavailableException('Storage provider is not initialized');
        }
        return this.storageProvider;
    }
}
