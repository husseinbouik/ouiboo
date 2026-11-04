import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const CONVERSATION_REPORT_REASONS = [
  'OFF_PLATFORM_PAYMENT',
  'HARASSMENT',
  'SPAM',
  'ID_DOCUMENT_REQUEST',
  'OTHER',
] as const;

export class ReportConversationDto {
  @IsString()
  @IsIn(CONVERSATION_REPORT_REASONS as unknown as string[])
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
