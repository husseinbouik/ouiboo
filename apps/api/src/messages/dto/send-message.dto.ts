import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsString()
  recipientId: string;
}

export class GetMessagesDto {
  @IsString()
  conversationId: string;

  page?: number = 1;
  limit?: number = 50;
}
