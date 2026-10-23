import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin review moderation (#393).
 * HIDE -> HIDDEN, REMOVE -> REMOVED (terminal), RESTORE -> VISIBLE.
 * A reason is required for HIDE and REMOVE (enforced in the service).
 */
export class ModerateReviewDto {
  @IsIn(['HIDE', 'REMOVE', 'RESTORE'])
  action!: 'HIDE' | 'REMOVE' | 'RESTORE';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
