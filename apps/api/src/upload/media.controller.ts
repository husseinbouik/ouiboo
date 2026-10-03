import {
    Controller,
    Get,
    Param,
    Res,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { UploadService } from './upload.service';

/**
 * Public media serving endpoint.
 * Serves uploaded files at the URLs returned by the upload endpoint
 * (S3_PUBLIC_URL is https://ouiboo-api.vercel.app/media).
 *
 * Private files (keys starting with 'private/') are never served here.
 */
@ApiTags('Media')
@Controller('media')
export class MediaController {
    constructor(private readonly uploadService: UploadService) { }

    @Get('*key')
    @ApiOperation({ summary: 'Serve an uploaded file' })
    @ApiResponse({ status: 200, description: 'File content' })
    @ApiResponse({ status: 403, description: 'Private file' })
    @ApiResponse({ status: 404, description: 'File not found' })
    async serveFile(
        @Param('key') key: string | string[],
        @Res() res: Response,
    ) {
        // Normalize key from wildcard param (can be string or array)
        const fileKey = Array.isArray(key) ? key.join('/') : key;

        if (!fileKey) {
            throw new NotFoundException('File not found');
        }

        // Never serve private files via the public endpoint
        const firstSegment = fileKey.split('/')[0];
        if (firstSegment === 'private') {
            throw new ForbiddenException('Access denied');
        }

        try {
            const { data, contentType } = await this.uploadService.readFile(fileKey);

            res.set({
                'Content-Type': contentType,
                'Content-Length': data.length.toString(),
                // Cache public media for 1 hour; uploads are immutable by key
                'Cache-Control': 'public, max-age=3600',
            });
            res.send(data);
        } catch {
            throw new NotFoundException('File not found');
        }
    }
}
