import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RemoveMessageAttachmentDto {
    @ApiProperty({
        example: 'Traveller sent a photo of a national ID card in chat',
        description: 'Mandatory reason recorded in the audit log.',
    })
    @IsString()
    @MinLength(3)
    @MaxLength(1000)
    reason!: string;
}
