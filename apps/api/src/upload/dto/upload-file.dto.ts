import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { UPLOAD_INTENTS, type UploadIntent } from '../upload.constants';

/**
 * Upload intent (#191).
 * - `trip-asset`: public trip photos, stored under `trips/{agencyId}/`, servable via the media endpoint.
 *   Agency-only (#665): a public, instantly-servable file must be bound to an
 *   agency's catalogue work — travellers/admins have no legitimate generic
 *   public upload, and a proof sent here would become public by accident.
 * - `identity-document`: private KYC/verification files, stored under `private/{userId}/`,
 *   never servable via the media endpoint — access only through signed URLs.
 * - `payment-proof` (#665): private payment proofs, stored under
 *   `private/{userId}/payment-proofs/`, access only through signed URLs.
 *   (Booking-bound proofs keep using POST /bookings/:id/payment-proof.)
 * - `avatar` (#665): public profile picture bound to the caller's own
 *   profile, stored under `avatars/{userId}/`.
 *
 * When the intent is omitted, it resolves by role: agencies default to
 * `trip-asset` (their catalogue work), everyone else to `avatar` (the
 * only public upload a non-agency caller can own).
 */
export class UploadFileDto {
    @ApiProperty({
        enum: UPLOAD_INTENTS,
        required: false,
        default: 'trip-asset',
        description: 'What the file is for. Identity documents are stored privately.',
    })
    @IsOptional()
    @IsIn(UPLOAD_INTENTS, { message: 'intent must be trip-asset, identity-document, payment-proof or avatar' })
    intent?: UploadIntent;
}
