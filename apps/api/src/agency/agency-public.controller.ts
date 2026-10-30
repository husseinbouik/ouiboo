import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { effectiveInsuranceStatus, effectiveLicenceStatus, effectiveVerificationStatus } from '../common/agency-licence.util';
import { derivePublicMediaUrl } from '../upload/media-url.util';

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
                // #688 (Council S6): the Public Verification Record —
                // insurer name + validity window, and the seller-block
                // facts (address / phone / IF / RC) the record and the
                // checkout block (#700) render from. Metadata only: no
                // document key is ever selected here.
                insuranceInsurer: true,
                insuranceValidFrom: true,
                businessAddress: true,
                businessPhone: true,
                rc: true,
                taxId: true,
                verificationPausedAt: true,
                verificationPauseReason: true,
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
            // #447: the stored logo is a file reference, not an address —
            // re-derive it against the current public media base at read
            // time (same adoption as the trip payloads in PR #601).
            logo: derivePublicMediaUrl(agency.logo) ?? null,
            // #569: the umbrella is reconciled with its components on
            // read — VERIFIED only when identity + licence + insurance
            // are all effectively verified (see agency-licence.util).
            verificationStatus: effectiveVerificationStatus(agency),
            legalName: agency.legalName,
            licenceVerified,
            // #673 (Council S6): the dated verification statement needs
            // the licence STATUS and EXPIRY alongside the verified-at
            // stamp (previously only the stamp was exposed). The expiry
            // is a public seller fact while the licence is verified;
            // it stays withheld for an unverified licence, like the
            // number and issue data above.
            travelLicenceStatus: effectiveLicenceStatus(agency),
            licenceExpiry: licenceVerified ? agency.licenceExpiry : null,
            travelLicenceType: licenceVerified ? agency.travelLicenceType : null,
            travelLicenceNumber: licenceVerified ? agency.travelLicenceNumber : null,
            licenceIssuedAt: licenceVerified ? agency.licenceIssuedAt : null,
            licenceIssuingAuthority: licenceVerified ? agency.licenceIssuingAuthority : null,
            licenceVerifiedAt: licenceVerified ? agency.licenceVerifiedAt : null,
            insuranceStatus: effectiveInsurance,
            insuranceVerifiedAt: insuranceVerified ? agency.insuranceVerifiedAt : null,
            // #688: the checkable Public Verification Record. Insurer
            // facts ride only while the insurance is effectively
            // VERIFIED (same withholding rule as the licence number);
            // `checkedOn` is the latest of the two verification stamps;
            // `tripsPaused` is the live consequence of a lapse — the
            // umbrella status already derives to non-VERIFIED when a
            // component lapses, and the expiry sweep's pause stamp is
            // surfaced verbatim when present. Seller-block facts are
            // public seller identity (Law 31-08), not verification
            // claims, so they are not gated on the licence state.
            verificationRecord: {
                legalName: agency.legalName,
                licenceNumber: licenceVerified ? agency.travelLicenceNumber : null,
                licenceType: licenceVerified ? agency.travelLicenceType : null,
                issuingAuthority: licenceVerified ? agency.licenceIssuingAuthority : null,
                licenceExpiry: licenceVerified ? agency.licenceExpiry : null,
                licenceStatus: effectiveLicenceStatus(agency),
                insurer: insuranceVerified ? agency.insuranceInsurer : null,
                insuranceValidFrom: insuranceVerified ? agency.insuranceValidFrom : null,
                insuranceExpiry: insuranceVerified ? agency.insuranceExpiry : null,
                insuranceStatus: effectiveInsurance,
                checkedOn: latestStamp(agency.licenceVerifiedAt, agency.insuranceVerifiedAt),
                status: effectiveVerificationStatus(agency),
                tripsPaused:
                    effectiveVerificationStatus(agency) !== 'VERIFIED' || Boolean(agency.verificationPausedAt),
                pausedAt: agency.verificationPausedAt,
                pauseReason: agency.verificationPauseReason,
            },
            businessAddress: agency.businessAddress,
            businessPhone: agency.businessPhone,
            rc: agency.rc,
            taxId: agency.taxId,
        };
    }
}

function latestStamp(...values: Array<Date | null | undefined>): Date | null {
    const times = values.filter((v): v is Date => v instanceof Date).map((v) => v.getTime());
    return times.length ? new Date(Math.max(...times)) : null;
}
