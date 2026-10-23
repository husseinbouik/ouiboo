import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class GenerateInvoiceDto {
    @ApiProperty({ example: 'agency-profile-id' })
    @IsString()
    @MinLength(1)
    agencyId!: string;

    @ApiProperty({ example: 2026, description: 'Four-digit year of the billing month (UTC)' })
    @IsInt()
    @Min(2000)
    @Max(2100)
    year!: number;

    @ApiProperty({ example: 10, description: 'Billing month, 1-12 (UTC)' })
    @IsInt()
    @Min(1)
    @Max(12)
    month!: number;

    @ApiProperty({
        required: false,
        example: 10,
        description:
            'Platform service fee rate in percent. Optional when OUIBOO_COMMISSION_RATE_PERCENT is configured; the applied rate is snapshotted onto the invoice.',
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    @Max(100)
    commissionRatePercent?: number;
}
