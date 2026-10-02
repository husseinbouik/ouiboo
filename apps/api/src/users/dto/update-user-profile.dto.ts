import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'Amina Benali', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiProperty({ example: 'MAD', required: false })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'displayCurrency must be a three-letter uppercase currency code',
  })
  displayCurrency?: string;
}
