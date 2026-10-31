import {
    Controller,
    Post,
    Get,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    BadRequestException,
    Body,
    Query,
    Res,
    UseGuards,
    Request,
    ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { SignedUrlQueryDto } from './dto/signed-url-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ALLOWED_MIME_TYPES_REGEX, MAX_UPLOAD_SIZE_BYTES, type UploadIntent } from './upload.constants';
import { RateLimit, RateLimitGuard, RateLimitSensitive } from '../common/rate-limit.guard';

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimitSensitive()
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post()
    @RateLimit({ points: 20, windowMs: 60_000, keyPrefix: 'upload:file' })
    @ApiOperation({ summary: 'Upload a file (Images or PDF)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                intent: {
                    type: 'string',
                    enum: ['trip-asset', 'identity-document', 'payment-proof', 'avatar'],
                    description: 'Upload intent. Omitted intent resolves by role (agency: trip-asset, others: avatar). Private intents never receive a public URL.',
                },
            },
        },
    })
    @ApiResponse({ status: 201, type: UploadResponseDto })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_SIZE_BYTES }),
                    new FileTypeValidator({ 
                        fileType: ALLOWED_MIME_TYPES_REGEX,
                        fallbackToMimetype: true,
                    }),
                ],
                errorHttpStatusCode: 400,
                exceptionFactory: (error) => {
                    // Replace technical validator message with user-friendly one (#140)
                    return new BadRequestException(
                        'Please upload a JPEG, PNG, WebP, or GIF image (or PDF). ' +
                        'HEIC photos from phones need to be converted to JPEG first.'
                    );
                },
            }),
        )
        file: Express.Multer.File,
        @Body() dto: UploadFileDto,
        @Request() req,
    ) {
        // #665: every generic upload is bound to a declared purpose and
        // an entity the caller owns. An omitted intent resolves by role
        // (agency → its catalogue, everyone else → their own avatar), so
        // the default can never mint an unattached public file either.
        const intent: UploadIntent =
            dto.intent ?? (req.user?.role === 'AGENCY' ? 'trip-asset' : 'avatar');
        // Public trip assets are agency work: a traveller declaring the
        // trip-asset purpose is asking to publish into a catalogue they
        // do not own — refused, never silently re-homed.
        if (intent === 'trip-asset' && req.user?.role !== 'AGENCY') {
            throw new ForbiddenException(
                'Public trip assets can only be uploaded by an agency account. Use a private upload intent for documents and payment proofs.',
            );
        }
        const folder = this.resolveFolder(intent, req.user);
        return this.uploadService.uploadFile(file, folder);
    }

    /**
     * Resolve the storage folder from the upload intent (#191, #665).
     * - trip-asset: `trips/{agencyId}/` (tenant-isolated, publicly servable, agency-only)
     * - identity-document: `private/{userId}/` (never publicly servable)
     * - payment-proof: `private/{userId}/payment-proofs/` (never publicly
     *   servable; the `{userId}` segment keeps signed-URL ownership checks
     *   working exactly like identity documents)
     * - avatar: `avatars/{userId}/` (public, bound to the caller's profile)
     */
    private resolveFolder(intent: UploadIntent, user?: { userId?: string; agencyId?: string | null }): string {
        if (intent === 'identity-document') {
            return `private/${user?.userId || 'anonymous'}`;
        }
        if (intent === 'payment-proof') {
            return `private/${user?.userId || 'anonymous'}/payment-proofs`;
        }
        if (intent === 'avatar') {
            return `avatars/${user?.userId || 'anonymous'}`;
        }
        return `trips/${user?.agencyId || user?.userId || 'anonymous'}`;
    }

    @Get('signed-url')
    @RateLimit({ points: 30, windowMs: 60_000, keyPrefix: 'upload:signed-url' })
    @ApiOperation({ summary: 'Get a short-lived signed URL for a private file' })
    @ApiResponse({ status: 200, description: 'Signed URL and expiry' })
    @ApiResponse({ status: 403, description: 'Not the file owner' })
    async getSignedUrl(@Query() query: SignedUrlQueryDto, @Request() req) {
        return this.uploadService.createSignedFileUrl(query.key, {
            userId: req.user.userId,
            role: req.user.role,
        });
    }

    /**
     * Token-bearer <redacted> (#391): this route is intentionally session-free.
     * The short-lived signed token issued by GET /upload/signed-url IS the
     * credential — UploadService.readPrivateFileByToken verifies its
     * signature, purpose, and expiry, and only serves private/ keys.
     * Ownership is enforced at issuance time (file owner or admin only),
     * not here. JwtAuthGuard is skipped for this handler only via @Public();
     * RateLimitGuard still applies.
     */
    @Get('file')
    @Public()
    @UseGuards(RateLimitGuard)
    @RateLimit({ points: 60, windowMs: 60_000, keyPrefix: 'upload:file-token' })
    @ApiOperation({ summary: 'Serve a private file via a signed token (no session required)' })
    @ApiQuery({ name: 'token', description: 'Token from the signed-url endpoint' })
    @ApiResponse({ status: 200, description: 'File content' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    @ApiResponse({ status: 403, description: 'Token does not reference a private file' })
    async servePrivateFile(@Query('token') token: string, @Res() res: Response) {
        if (!token) {
            throw new BadRequestException('Missing token');
        }
        const { data, contentType, key } = await this.uploadService.readPrivateFileByToken(token);
        res.set({
            'Content-Type': contentType,
            'Content-Length': data.length.toString(),
            // The token URL is a credential: never store the response, never
            // leak the URL via Referer, and force a safe download.
            'Cache-Control': 'private, no-store',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
            // Key segments are restricted to [a-zA-Z0-9._-] by the service's
            // assertSafeKey, so the basename is safe to quote here.
            'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
        });
        res.send(data);
    }
}

