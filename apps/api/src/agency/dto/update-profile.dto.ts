import { IsArray, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// #419: international phone shape — leading '+' or digit, then digits
// with common separators. Deliberately not country-specific (no +212
// assumption); the emergency contact may be any reachable number.
export const EMERGENCY_CONTACT_PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{5,24}$/;

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

  // #691 (Council S6): storefront about, language-keyed
  // ({ "fr": "...", "ar": "...", "en": "..." } — data-driven keys).
  @IsOptional()
  @IsObject()
  aboutTranslations?: Record<string, string>;

  // #691: languages the agency works in (ISO codes).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

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

  // #700 (Council S6): public business phone for the Law 31-08
  // Art. 29(2) seller block at checkout. Same reachable-number shape
  // as the emergency contact; never a personal number by assumption —
  // the agency supplies it as its public seller phone.
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(EMERGENCY_CONTACT_PHONE_PATTERN, {
    message: 'businessPhone must be a reachable phone number',
  })
  businessPhone?: string;

  // #419 (Council P0-16): trip emergency contact — shown to travellers
  // holding a booking (departure pack) as the FIRST call during an
  // active trip. Optional: an agency without one gets the honest
  // "no emergency contact published" fallback on the traveller side.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(EMERGENCY_CONTACT_PHONE_PATTERN, {
    message: 'emergencyContactPhone must be a reachable phone number',
  })
  emergencyContactPhone?: string;
}
