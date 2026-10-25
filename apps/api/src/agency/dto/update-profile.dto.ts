import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAgencyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bankDetails?: string;

  // #421 (Council P0-19): the submitted destination's account holder
  // name and bank attestation (relevé bancaire) document, reviewed by
  // an admin against legalName before the details can go live.
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bankAccountHolderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  bankAttestationUrl?: string;

  // #371: legal identity fields (plan §6). Licence fields are managed
  // through the onboarding flow and are deliberately not editable here.
  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  rc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  businessAddress?: string;
}
