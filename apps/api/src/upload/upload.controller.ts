import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards, Request } from '@nestjs/common';
import { ALLOWED_MIME_TYPES_REGEX, MAX_UPLOAD_SIZE_BYTES } from './upload.constants';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
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
            }),
        )
        file: Express.Multer.File,
        @Request() req,
    ) {
        console.log('[UploadController] Uploading file:', file.originalname, 'Type:', file.mimetype, 'Size:', file.size);
        const folder = req.user?.userId || 'anonymous';
        return this.uploadService.uploadFile(file, folder);
    }
}
