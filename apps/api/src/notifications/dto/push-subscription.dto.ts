import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PushSubscriptionKeysDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  p256dh!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  auth!: string;
}

/**
 * #784: body of POST /notifications/push/subscribe — the exact shape a
 * browser PushSubscription serialises to (`subscription.toJSON()`),
 * plus the caller's user agent for support/debugging.
 */
export class SubscribePushDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class UnsubscribePushDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  endpoint!: string;
}
