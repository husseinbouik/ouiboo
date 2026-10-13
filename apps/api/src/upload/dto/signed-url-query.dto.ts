import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Query DTO for the private-file signed URL endpoint (#191).
 * The key must point at a private file; public files don't need signed URLs.
 */
export class SignedUrlQueryDto {
    @ApiProperty({
        example: 'private/cmurkssdw000773l999fbx2x0/43ae71e9-6d65-484f-8d62-cd908326f3ff.png',
        description: 'Storage key of the private file.',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^private\//, { message: 'key must point to a private file' })
    key: string;
}
