import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { UPLOAD_INTENTS, type UploadIntent } from '../upload.constants';

/**
 * Upload intent (#191).
 * - `trip-asset`: public trip photos, stored under `trips/{agencyId}/`, servable via the media endpoint.
 * - `identity-document`: private KYC/verification files, stored under `private/{userId}/`,
 *   never servable via the media endpoint — access only through signed URLs.
 *
 * Defaults to `trip-asset` so existing callers keep working unchanged.
 */
export class UploadFileDto {
    @ApiProperty({
        enum: UPLOAD_INTENTS,
        required: false,
        default: 'trip-asset',
        description: 'What the file is for. Identity documents are stored privately.',
    })
    @IsOptional()
    @IsIn(UPLOAD_INTENTS, { message: 'intent must be trip-asset or identity-document' })
    intent?: UploadIntent;
}
