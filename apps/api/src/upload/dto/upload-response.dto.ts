import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
    @ApiProperty({ example: 'https://api.ouiboo.com/uploads/123456789-image.jpg' })
    url: string;

    @ApiProperty({ example: 'image.jpg' })
    filename: string;

    @ApiProperty({ example: 1024 })
    size: number;
}
