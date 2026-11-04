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
 * - `review-photo` (#776): private traveller photo for a review, stored
 *   under `private/{userId}/review-photos/`, never servable via the media
 *   endpoint — served only while its review is VISIBLE (through the
 *   review photo endpoint) or to the owner/admin via signed URLs.
 * - `review-video` (#783): private traveller video for a review (at most
 *   one per review), stored under `private/{userId}/review-videos/`,
 *   never servable via the media endpoint — served only while its
 *   review is VISIBLE (through the review video endpoint) or to the
 *   owner/admin via signed URLs. Video mime types (MP4/WebM/MOV) and
 *   the 50MB cap are accepted ONLY for this intent.
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
    @IsIn(UPLOAD_INTENTS, { message: 'intent must be trip-asset, identity-document, payment-proof, avatar, review-photo or review-video' })
    intent?: UploadIntent;
}
