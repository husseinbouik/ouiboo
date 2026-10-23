import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
    ExecutionContext,
    ForbiddenException,
    INestApplication,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadSafetyService } from './upload-safety.service';
import { SIGNED_URL_TOKEN_PURPOSE } from './upload.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { RateLimitGuard } from '../common/rate-limit.guard';

const TEST_SECRET = 'upload-file-token-spec-secret';
const PRIVATE_KEY = 'private/user-1/document.pdf';

/**
 * Signed-token private-file download (#391).
 *
 * GET /upload/file is a token-bearer <redacted> route: no session is required,
 * the short-lived signed token is the credential. These tests pin that
 * contract at the service level (signature/purpose/expiry) and at the
 * HTTP level (unauthenticated access, safe response headers, sibling
 * routes still session-guarded).
 */
describe('UploadService.readPrivateFileByToken (#391)', () => {
    const jwt = new JwtService({ secret: TEST_SECRET });
    const read = jest.fn();
    let service: UploadService;

    beforeEach(async () => {
        jest.clearAllMocks();
        read.mockResolvedValue({ data: Buffer.from('file-bytes'), contentType: 'application/pdf' });
        service = new UploadService({ validate: jest.fn() } as unknown as UploadSafetyService, jwt);
        // Wait out the real provider init, then substitute the storage stub.
        await (service as unknown as { initialization: Promise<void> }).initialization;
        (service as unknown as { storageProvider: unknown }).storageProvider = { read };
    });

    const sign = (payload: Record<string, unknown>, options?: { expiresIn?: number }, svc: JwtService = jwt) =>
        svc.signAsync(payload, options);

    it('returns the file for a valid token — no session involved', async () => {
        const token = await sign({ key: PRIVATE_KEY, purpose: SIGNED_URL_TOKEN_PURPOSE }, { expiresIn: 300 });
        const result = await service.readPrivateFileByToken(token);
        expect(result.data.toString()).toBe('file-bytes');
        expect(result.contentType).toBe('application/pdf');
        expect(result.key).toBe(PRIVATE_KEY);
        expect(read).toHaveBeenCalledWith(PRIVATE_KEY);
    });

    it('rejects an expired token with 401', async () => {
        const token = await sign({ key: PRIVATE_KEY, purpose: SIGNED_URL_TOKEN_PURPOSE }, { expiresIn: -60 });
        await expect(service.readPrivateFileByToken(token)).rejects.toThrow(UnauthorizedException);
        expect(read).not.toHaveBeenCalled();
    });

    it('rejects a tampered token (signed with another secret) with 401', async () => {
        const other = new JwtService({ secret: 'a-different-secret' });
        const token = await sign({ key: PRIVATE_KEY, purpose: SIGNED_URL_TOKEN_PURPOSE }, { expiresIn: 300 }, other);
        await expect(service.readPrivateFileByToken(token)).rejects.toThrow(UnauthorizedException);
        expect(read).not.toHaveBeenCalled();
    });

    it('rejects a token with the wrong purpose with 401', async () => {
        const token = await sign({ key: PRIVATE_KEY, purpose: 'something-else' }, { expiresIn: 300 });
        await expect(service.readPrivateFileByToken(token)).rejects.toThrow(UnauthorizedException);
        expect(read).not.toHaveBeenCalled();
    });

    it('rejects a token pointing at a non-private key with 403', async () => {
        const token = await sign(
            { key: 'trips/agency-1/photo.png', purpose: SIGNED_URL_TOKEN_PURPOSE },
            { expiresIn: 300 },
        );
        await expect(service.readPrivateFileByToken(token)).rejects.toThrow(ForbiddenException);
        expect(read).not.toHaveBeenCalled();
    });
});

describe('GET /upload/file route wiring (#391)', () => {
    const handler = UploadController.prototype.servePrivateFile;

    it('marks only the file-download handler @Public()', () => {
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, UploadController.prototype.uploadFile)).toBeUndefined();
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, UploadController.prototype.getSignedUrl)).toBeUndefined();
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, UploadController)).toBeUndefined();
    });

    it('keeps RateLimitGuard and its rate-limit metadata on the handler', () => {
        // '__guards__' is Nest's GUARDS_METADATA key.
        const guards = (Reflect.getMetadata('__guards__', handler) as unknown[]) ?? [];
        expect(guards).toContain(RateLimitGuard);
        // 'ouiboo:rate-limit' is the (unexported) RATE_LIMIT_KEY in rate-limit.guard.ts.
        expect(Reflect.getMetadata('ouiboo:rate-limit', handler)).toMatchObject({
            keyPrefix: 'upload:file-token',
        });
    });
});

describe('GET /upload/file (HTTP, #391)', () => {
    const jwt = new JwtService({ secret: TEST_SECRET });
    let app: INestApplication;

    const sign = (payload: Record<string, unknown>, options?: { expiresIn?: number }) =>
        jwt.signAsync(payload, options);

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [UploadController],
            providers: [
                UploadService,
                UploadSafetyService,
                { provide: JwtService, useValue: jwt },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                // Mirrors the real guard: @Public() handlers pass without a
                // session; all other routes need the test bearer <redacted>
                canActivate: (context: ExecutionContext) => {
                    if (Reflect.getMetadata(IS_PUBLIC_KEY, context.getHandler())) {
                        return true;
                    }
                    const req = context.switchToHttp().getRequest();
                    if (req.headers.authorization === 'Bearer <redacted>') {
                        req.user = { userId: 'user-1', role: 'TRAVELER' };
                        return true;
                    }
                    throw new UnauthorizedException('Missing or invalid token');
                },
            })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: () => true })
            .compile();

        const service = moduleRef.get(UploadService);
        await (service as unknown as { initialization: Promise<void> }).initialization;
        (service as unknown as { storageProvider: unknown }).storageProvider = {
            read: jest.fn().mockResolvedValue({
                data: Buffer.from('file-bytes'),
                contentType: 'application/pdf',
            }),
        };

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('serves the file to an unauthenticated caller with a valid token', async () => {
        const token = await sign({ key: PRIVATE_KEY, purpose: SIGNED_URL_TOKEN_PURPOSE }, { expiresIn: 300 });
        const res = await request(app.getHttpServer())
            .get('/upload/file')
            .query({ token })
            .expect(200);
        // Attachment + PDF responses are delivered as a binary body.
        const body = Buffer.isBuffer(res.body) ? res.body.toString() : res.text;
        expect(body).toBe('file-bytes');
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.headers['referrer-policy']).toBe('no-referrer');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('document.pdf');
    });

    it('rejects an expired token with 401', async () => {
        const token = await sign({ key: PRIVATE_KEY, purpose: SIGNED_URL_TOKEN_PURPOSE }, { expiresIn: -60 });
        await request(app.getHttpServer()).get('/upload/file').query({ token }).expect(401);
    });

    it('rejects a tampered token with 401', async () => {
        const token = await sign({ key: PRIVATE_KEY, purpose: SIGNED_URL_TOKEN_PURPOSE }, { expiresIn: 300 });
        const tampered = `${token.slice(0, -2)}xx`;
        await request(app.getHttpServer()).get('/upload/file').query({ token: tampered }).expect(401);
    });

    it('rejects a missing token with 400', async () => {
        await request(app.getHttpServer()).get('/upload/file').expect(400);
    });

    it('still requires a session for uploads (owner flow unaffected)', async () => {
        await request(app.getHttpServer()).post('/upload').expect(401);
    });

    it('still requires a session to mint a signed URL', async () => {
        await request(app.getHttpServer())
            .get('/upload/signed-url')
            .query({ key: PRIVATE_KEY })
            .expect(401);
    });

    it('lets the authenticated owner mint a signed URL for their own file', async () => {
        const res = await request(app.getHttpServer())
            .get('/upload/signed-url')
            .set('Authorization', 'Bearer <redacted>')
            .query({ key: PRIVATE_KEY })
            .expect(200);
        expect(res.body.url).toContain('/upload/file?token=');
    });

    it('forbids minting a signed URL for another user\u2019s file', async () => {
        await request(app.getHttpServer())
            .get('/upload/signed-url')
            .set('Authorization', 'Bearer <redacted>')
            .query({ key: 'private/user-2/document.pdf' })
            .expect(403);
    });
});
