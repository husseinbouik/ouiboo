import { IsString, MaxLength } from 'class-validator';

export class BlockAgencyDto {
  @IsString()
  @MaxLength(64)
  agencyId!: string;
}
