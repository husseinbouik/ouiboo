import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { MAX_REVIEW_PHOTOS } from '../../upload/upload.constants';

/**
 * #776 (Council S6 Phase 3): the four review sub-scores. Optional but
 * encouraged — the overall `rating` stays the headline and remains the
 * only required score. Each sub-score is an independent 1–5 integer;
 * travellers may score any subset.
 */
class SubScoresDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  organisationRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  guideRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  valueRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  accuracyRating?: number;
}

export class CreateReviewDto extends SubScoresDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  /**
   * #776: storage keys of photos the traveller already uploaded through
   * the private `review-photo` upload intent
   * (`private/{travelerId}/review-photos/…`). The service re-validates
   * ownership, shape and count — a key the caller does not own, a public
   * key, or a non-image key is rejected, never re-homed.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REVIEW_PHOTOS)
  @IsString({ each: true })
  photoKeys?: string[];

  /**
   * #783: storage key of the ONE video the traveller already uploaded
   * through the private `review-video` upload intent
   * (`private/{travelerId}/review-videos/…`). Optional. The service
   * re-validates ownership, shape and extension — a key the caller
   * does not own, a public key, or a non-video key is rejected, never
   * re-homed.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoKey?: string;
}

export class ReviewResponseDto {
  @IsString()
  @MaxLength(500)
  response!: string;
}

export class UpdateReviewDto extends SubScoresDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  /**
   * #783: replace or clear the review's video under the same edit
   * rules as the rest of the review. Omit to keep the current video;
   * send a new `review-video` upload key to replace it; send `null`
   * to remove it. The service re-validates ownership/shape exactly
   * like create.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoKey?: string | null;
}
