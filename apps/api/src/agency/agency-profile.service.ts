import { Injectable } from '@nestjs/common';
import { Controller, Get, UseGuards, Request, Patch, Body, Post, Query, Param, Res, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateAgencyProfileDto } from './dto/update-profile.dto';
import { getAgencyActivationBlock } from '../common/agency-licence.util';
import { isBankDestinationVerified } from '../common/bank-details.util';
import { Prisma } from '@ouiboo/database';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class AgencyProfileService {
    constructor(
        private readonly prisma: DatabaseService,
    ) { }

    async updateProfile(@Request() req: AuthenticatedRequest, @Body() data: UpdateAgencyProfileDto) {
        const existing = await this.prisma.agencyProfile.findUnique({
            where: { id: req.tenantId },
            select: {
                bankDetails: true,
                pendingBankDetails: true,
                bankDetailsStatus: true,
                bankDetailsVerifiedAt: true,
                // #419 fix: the activation gate below compares the
                // submitted holder name / attestation against the stored
                // values, so they must be selected — previously the
                // controller could not tell "present but unchanged" from
                // "changed" for these fields at all.
                bankAccountHolderName: true,
                bankAttestationUrl: true,
                // #988: Cash Plus destination review state.
                cashPlusBeneficiaryName: true,
                cashPlusPhone: true,
                pendingCashPlusBeneficiaryName: true,
                pendingCashPlusPhone: true,
                cashPlusEnabled: true,
                cashPlusStatus: true,
                cashPlusVerifiedAt: true,
                verificationStatus: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
                // #415: the activation block also requires verified RC
                // insurance (first bank-destination submission = payment
                // activation), so the gate needs the insurance fields.
                insuranceStatus: true,
                insuranceExpiry: true,
            },
        });
        if (!existing) throw new NotFoundException('Agency profile not found');

        // #419 fix: the #371/#415 activation gate guards CHANGES to the
        // payment destination — it must not reject the whole profile
        // PATCH just because bank fields are present in the payload.
        // The agency Settings form always submits every field bundled
        // together, so the old placement (gate inside the bankDetails
        // branch, whose no-change exemption only recognised a
        // resubmission of the pending value, or of the live value while
        // the destination was verified) meant an agency whose RC
        // insurance was not yet verified could not save ANY setting —
        // emergency contacts, bio, company name — whenever the bundled
        // bankDetails did not exactly match the pending submission.
        // Scoped rule: compare each payment-destination field against
        // what is stored; only an actual change is gated, and only
        // while the agency has no verified destination yet (replacing
        // a verified destination stays review-gated, not agency-gated,
        // as before). Clearing the details is a deactivation, not an
        // activation, and stays ungated.
        const normalized = (value?: string | null) => (value ?? '').trim();
        const submittedBankDetails =
            data.bankDetails !== undefined ? data.bankDetails.trim() : undefined;
        const bankDetailsChanged =
            submittedBankDetails !== undefined &&
            submittedBankDetails !== '' &&
            submittedBankDetails !== normalized(existing.pendingBankDetails) &&
            submittedBankDetails !== normalized(existing.bankDetails);
        const holderNameChanged =
            data.bankAccountHolderName !== undefined &&
            normalized(data.bankAccountHolderName) !==
                normalized(existing.bankAccountHolderName);
        const attestationChanged =
            data.bankAttestationUrl !== undefined &&
            normalized(data.bankAttestationUrl) !==
                normalized(existing.bankAttestationUrl);
        if (
            (bankDetailsChanged || holderNameChanged || attestationChanged) &&
            !isBankDestinationVerified(existing)
        ) {
            const block = getAgencyActivationBlock(existing);
            if (block) throw new ForbiddenException(block);
        }

        // #421 (Council P0-19): bank details are a payment DESTINATION,
        // not free text that goes live on save. A submission is stored in
        // pendingBankDetails (with holder name + bank attestation) and
        // only an admin verification promotes it to the live bankDetails
        // travellers see. While a replacement is under review the
        // previously verified instructions stay live, and a submission no
        // longer resets the whole-agency verificationStatus — destination
        // review replaces that side effect.
        const destination: Prisma.AgencyProfileUpdateInput = {};
        if (data.bankDetails !== undefined) {
            const submitted = data.bankDetails.trim();
            if (!submitted) {
                // Clearing the instructions deactivates the destination:
                // nothing remains traveller-visible and the status resets.
                destination.bankDetails = null;
                destination.pendingBankDetails = null;
                destination.bankDetailsStatus = 'UNVERIFIED';
                destination.bankDetailsVerifiedAt = null;
                destination.bankDetailsVerifiedBy = null;
                destination.bankDetailsRejectionReason = null;
            } else if (
                submitted !== existing.pendingBankDetails &&
                submitted !== existing.bankDetails
            ) {
                // A genuinely new destination submission. The #371/#415
                // activation gate (verified identity + licence + RC
                // insurance) has already been applied above, scoped to
                // actual destination changes (#419 fix) — a submission
                // identical to the stored live details is a no-op here
                // regardless of the destination's verification state, so
                // it can never re-gate or re-pend what is already stored.
                destination.pendingBankDetails = submitted;
                destination.bankDetailsStatus = 'PENDING_REVIEW';
                destination.bankDetailsRejectionReason = null;
            }
        }
        if (data.bankAccountHolderName !== undefined) {
            destination.bankAccountHolderName = data.bankAccountHolderName.trim() || null;
        }
        if (data.bankAttestationUrl !== undefined) {
            destination.bankAttestationUrl = data.bankAttestationUrl.trim() || null;
        }

        // #988: Cash Plus infos follow the same rule as bank details —
        // a submission pends for admin review and only verification
        // promotes it to the live traveller-visible destination. The
        // toggle is the agency's own switch and applies immediately;
        // turning it off hides the method at checkout without erasing
        // the verified infos.
        const cashPlus: Prisma.AgencyProfileUpdateInput = {};
        if (data.cashPlusEnabled !== undefined) {
            cashPlus.cashPlusEnabled = data.cashPlusEnabled;
        }
        const submittedCpName =
            data.cashPlusBeneficiaryName !== undefined ? data.cashPlusBeneficiaryName.trim() : undefined;
        const submittedCpPhone =
            data.cashPlusPhone !== undefined ? data.cashPlusPhone.trim() : undefined;
        if (submittedCpName !== undefined || submittedCpPhone !== undefined) {
            const nextName = submittedCpName || normalized(existing.pendingCashPlusBeneficiaryName) || normalized(existing.cashPlusBeneficiaryName);
            const nextPhone = submittedCpPhone || normalized(existing.pendingCashPlusPhone) || normalized(existing.cashPlusPhone);
            if (!nextName && !nextPhone) {
                // Clearing both infos deactivates the destination.
                cashPlus.cashPlusBeneficiaryName = null;
                cashPlus.cashPlusPhone = null;
                cashPlus.pendingCashPlusBeneficiaryName = null;
                cashPlus.pendingCashPlusPhone = null;
                cashPlus.cashPlusStatus = 'UNVERIFIED';
                cashPlus.cashPlusVerifiedAt = null;
                cashPlus.cashPlusVerifiedBy = null;
                cashPlus.cashPlusRejectionReason = null;
            } else if (
                (nextName !== normalized(existing.pendingCashPlusBeneficiaryName) &&
                    nextName !== normalized(existing.cashPlusBeneficiaryName)) ||
                (nextPhone !== normalized(existing.pendingCashPlusPhone) &&
                    nextPhone !== normalized(existing.cashPlusPhone))
            ) {
                // A genuinely new submission (name or phone changed
                // versus both the pending and the live values).
                if (!nextName || !nextPhone) {
                    throw new BadRequestException('Cash Plus beneficiary name and phone number are both required');
                }
                cashPlus.pendingCashPlusBeneficiaryName = nextName;
                cashPlus.pendingCashPlusPhone = nextPhone;
                cashPlus.cashPlusStatus = 'PENDING_REVIEW';
                cashPlus.cashPlusRejectionReason = null;
            }
        }

        return this.prisma.agencyProfile.update({
            where: { id: req.tenantId },
            data: {
                companyName: data.companyName?.trim(),
                bio: data.bio?.trim(),
                // #691: storefront about (language-keyed) + languages —
                // undefined skips, an empty map/array clears.
                aboutTranslations:
                    data.aboutTranslations !== undefined
                        ? (data.aboutTranslations as unknown as Prisma.InputJsonValue)
                        : undefined,
                languages:
                    data.languages !== undefined
                        ? data.languages.map((l) => l.trim().toLowerCase()).filter(Boolean).slice(0, 20)
                        : undefined,
                logo: data.logo?.trim(),
                legalName: data.legalName?.trim(),
                rc: data.rc?.trim(),
                taxId: data.taxId?.trim(),
                legalRepresentative: data.legalRepresentative?.trim(),
                businessAddress: data.businessAddress?.trim(),
                // #700: public seller phone — same undefined-skips /
                // empty-clears semantics as the emergency contact below.
                businessPhone:
                    data.businessPhone !== undefined
                        ? data.businessPhone.trim() || null
                        : undefined,
                // #419: emergency contact — undefined skips the field,
                // an empty string clears it (same semantics as the
                // nullable profile fields above).
                emergencyContactName:
                    data.emergencyContactName !== undefined
                        ? data.emergencyContactName.trim() || null
                        : undefined,
                emergencyContactPhone:
                    data.emergencyContactPhone !== undefined
                        ? data.emergencyContactPhone.trim() || null
                        : undefined,
                ...destination,
                ...cashPlus,
            }
        });
    }
}
