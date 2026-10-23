import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ConnectPaymentProfileDto {
    @IsString()
    @MaxLength(40)
    provider!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(120)
    externalMerchantId!: string;

    @IsOptional()
    @IsString()
    @IsIn(['MAD', 'EUR', 'USD'])
    currency?: string;

    /**
     * The NAME of an environment variable holding the provider webhook
     * secret — never the secret value itself. Secrets are resolved from
     * environment configuration at webhook time (fail closed).
     */
    @IsOptional()
    @IsString()
    @Matches(/^[A-Za-z_][A-Za-z0-9_]*$/, {
        message: 'webhookSecretRef must be an environment variable name',
    })
    webhookSecretRef?: string;
}
