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
}
