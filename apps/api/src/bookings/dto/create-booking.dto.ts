import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsPositive } from 'class-validator';

export class CreateBookingDto {
    @ApiProperty({ example: 'clxpcyz12000008l2h3j4k5l6' })
    @IsString()
    sessionId: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @IsPositive()
    guestsCount: number;
}
