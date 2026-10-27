import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { effectiveInsuranceStatus, effectiveLicenceStatus } from '../common/agency-licence.util';

@ApiTags('Agency Public')
@Controller('agencies')
export class AgencyPublicController {
    constructor(private readonly prisma: DatabaseService) { }

    @Get(':id/public')
    @ApiOperation({ summary: 'Get public agency profile' })
    async getPublicProfile(@Param('id') id: string) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { id },
            select: {
                id: true,
                companyName: true,
                bio: true,
                logo: true,
                verificationStatus: true,
                // #371: seller-of-record display. The licence number itself
                // is only exposed while the licence is verified (Law 11-16
                // requires verified agents to display it publicly).
                legalName: true,
                travelLicenceType: true,
                travelLicenceNumber: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
                // B4: seller-block issue data — same withholding rule as
                // the licence number (exposed only while VERIFIED).
                licenceIssuedAt: true,
                licenceIssuingAuthority: true,
                // #413 (Council B10): what+when verification statement on the
                // public profile — the licence check date and the RC
                // insurance evidence date.
                licenceVerifiedAt: true,
                insuranceStatus: true,
                insuranceExpiry: true,
                insuranceVerifiedAt: true,
            }
        });

        if (!agency) {
            throw new NotFoundException('Agency not found');
        }

        const licenceVerified = effectiveLicenceStatus(agency) === 'VERIFIED';
        const effectiveInsurance = effectiveInsuranceStatus(agency);
        const insuranceVerified = effectiveInsurance === 'VERIFIED';

        return {
            id: agency.id,
            companyName: agency.companyName,
            bio: agency.bio,
            logo: agency.logo,
            verificationStatus: agency.verificationStatus,
            legalName: agency.legalName,
            licenceVerified,
            travelLicenceType: licenceVerified ? agency.travelLicenceType : null,
            travelLicenceNumber: licenceVerified ? agency.travelLicenceNumber : null,
            licenceIssuedAt: licenceVerified ? agency.licenceIssuedAt : null,
            licenceIssuingAuthority: licenceVerified ? agency.licenceIssuingAuthority : null,
            licenceVerifiedAt: licenceVerified ? agency.licenceVerifiedAt : null,
            insuranceStatus: effectiveInsurance,
            insuranceVerifiedAt: insuranceVerified ? agency.insuranceVerifiedAt : null,
        };
    }
}
