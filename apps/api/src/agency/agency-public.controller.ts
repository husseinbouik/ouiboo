import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { effectiveLicenceStatus } from '../common/agency-licence.util';

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
                travelLicenceNumber: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
            }
        });

        if (!agency) {
            throw new NotFoundException('Agency not found');
        }

        const licenceVerified = effectiveLicenceStatus(agency) === 'VERIFIED';

        return {
            id: agency.id,
            companyName: agency.companyName,
            bio: agency.bio,
            logo: agency.logo,
            verificationStatus: agency.verificationStatus,
            legalName: agency.legalName,
            licenceVerified,
            travelLicenceNumber: licenceVerified ? agency.travelLicenceNumber : null,
        };
    }
}
