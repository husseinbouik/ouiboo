import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SUPPORT_TICKET_CATEGORIES = [
  'BOOKING',
  'PAYMENT',
  'REFUND',
  'ACCOUNT',
  'TRIP',
  'COMPLAINT',
  'TECHNICAL',
  'OTHER',
] as const;
export type SupportTicketCategoryDto = (typeof SUPPORT_TICKET_CATEGORIES)[number];

export const SUPPORT_REQUESTER_ROLES = ['TRAVELER', 'AGENCY', 'GUEST'] as const;
export type SupportRequesterRoleDto = (typeof SUPPORT_REQUESTER_ROLES)[number];

export const SUPPORT_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type SupportTicketStatusDto = (typeof SUPPORT_TICKET_STATUSES)[number];

/**
 * #446 (Council P2-07): a help-centre ticket. Categories mirror the
 * sections already published on the traveller support page (#419:
 * bookings / payments, refunds, complaints, plus account, trip,
 * technical and other) — no new support policy is introduced here.
 */
export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Amine Traveller' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  requesterName!: string;

  @ApiProperty({ example: 'amine@example.com' })
  @IsEmail()
  @MaxLength(320)
  requesterEmail!: string;

  @ApiProperty({ required: false, enum: SUPPORT_REQUESTER_ROLES, example: 'TRAVELER' })
  @IsOptional()
  @IsIn(SUPPORT_REQUESTER_ROLES)
  requesterRole?: SupportRequesterRoleDto;

  @ApiProperty({ required: false, enum: SUPPORT_TICKET_CATEGORIES, example: 'BOOKING' })
  @IsOptional()
  @IsIn(SUPPORT_TICKET_CATEGORIES)
  category?: SupportTicketCategoryDto;

  @ApiProperty({ example: 'My booking is still pending' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: 'I uploaded my payment proof yesterday and the booking is still pending.' })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;

  @ApiProperty({ required: false, example: 'booking-reference' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bookingRef?: string;
}

export class UpdateSupportTicketDto {
  @ApiProperty({ enum: SUPPORT_TICKET_STATUSES })
  @IsIn(SUPPORT_TICKET_STATUSES)
  status!: SupportTicketStatusDto;
}
