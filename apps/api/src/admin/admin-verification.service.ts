import { Injectable } from '@nestjs/common';
import { SUBSCRIPTION_STATUSES, VERIFICATION_STATUSES } from './admin-query.service';
import { Controller, Get, Post, Body, Param, UseGuards, Patch, BadRequestException, Query, Request, Res } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
    type BookingStatusType,
    type SubscriptionStatusType,
    UserRole,
    VerificationStatus,
    type VerificationStatusType,
    SubscriptionStatus,
    BookingStatus,
} from '@ouiboo/types';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';
import { EmailService } from '../email/email.service';
import { PaymentCustodian, PaymentLedgerSource, PaymentMethod, Prisma } from '@ouiboo/database';
import { AuditLogService } from './audit-log.service';
import { PaymentsService } from '../payments/payments.service';
import { serializeDuplicateCreditFlag } from '../bookings/bookings.service';
import { type MoneyInput } from '../common/money.util';
import { effectiveInsuranceStatus, effectiveLicenceStatus, getAgencyActivationBlock, sellerBlockMissingFields } from '../common/agency-licence.util';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class AdminVerificationService {
    constructor(
        private readonly db: DatabaseService,
        private readonly externalPaymentsService: ExternalPaymentsService,
        private readonly stagedPaymentsService: StagedPaymentsService,
        private readonly emailService: EmailService,
        private readonly auditLogService: AuditLogService,
        private readonly paymentsService: PaymentsService,
    ) { }

    async verifyPayment(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body('status') status: 'VERIFIED' | 'REJECTED',
        @Body('rejectionReason') rejectionReason?: string
    ) {
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid payment proof status');
        }
        if (status === 'REJECTED' && !rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting a payment');
        }

        const result = await this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.findUnique({
                where: { id },
                include: { booking: { include: { session: { include: { template: true } }, traveler: true, paymentPlan: true } } }
            });

            if (!proof) {
                throw new BadRequestException('Payment proof not found');
            }

            if (proof.status !== 'PENDING') {
                throw new BadRequestException('Payment proof has already been reviewed');
            }

            if (proof.booking.status !== 'AWAITING_VALIDATION') {
                throw new BadRequestException('Booking is not awaiting payment validation');
            }

            // #422 (Council P0-20): admin proof review is no longer
            // settlement either. A VERIFIED decision ACCEPTS the proof
            // image only — the booking, the plan and the ExternalPayment
            // stay pending until the AGENCY confirms the credit in its own
            // bank account (only the agency can see that account, so there
            // is deliberately no admin bank-confirmation override; founder
            // decision D3). Rejection stays one-step.
            const approved = status === 'VERIFIED';
            const updatedProof = await tx.paymentProof.update({
                where: { id },
                data: {
                    status: approved ? 'ACCEPTED' : 'REJECTED',
                    rejectionReason: approved ? null : rejectionReason,
                }
            });

            if (approved) {
                return {
                    updatedProof,
                    bookingId: proof.bookingId,
                    travelerEmail: proof.booking.traveler?.email,
                    tripTitle: proof.booking.session.template.title,
                    fullyPaid: false,
                };
            }

            // #369: staged bookings follow the plan state machine on
            // rejection (deposit stage fails the booking; balance stage
            // keeps the confirmed booking with the deposit paid).
            if (proof.booking.paymentPlan) {
                await this.stagedPaymentsService.applyProofRejectionInTransaction(tx, {
                    booking: proof.booking,
                    plan: proof.booking.paymentPlan,
                    source: PaymentLedgerSource.ADMIN_PROOF_REVIEW,
                    externalReference: proof.id,
                });
                return {
                    updatedProof,
                    bookingId: proof.bookingId,
                    travelerEmail: proof.booking.traveler?.email,
                    tripTitle: proof.booking.session.template.title,
                    fullyPaid: false,
                };
            }

            const updatedBooking = await tx.booking.update({
                where: { id: proof.bookingId },
                data: {
                    status: 'REJECTED',
                    paymentStatus: 'FAILED',
                    confirmedAt: null,
                },
                include: { session: { include: { template: true } } }
            });

            // #368: rejecting a payment proof records the fact only. It
            // must never credit a withdrawable OuiBoo balance.
            await this.externalPaymentsService.recordPaymentRejectedInTransaction(tx, {
                bookingId: updatedBooking.id,
                agencyId: updatedBooking.session.template.agencyId,
                travelerId: proof.booking.travelerId,
                amount: updatedBooking.totalAmount,
                currency: updatedBooking.currency,
                method: updatedBooking.paymentMethod ?? PaymentMethod.MANUAL,
                externalReference: proof.id,
                custodian: PaymentCustodian.AGENCY,
                source: PaymentLedgerSource.ADMIN_PROOF_REVIEW,
            });

            return {
                updatedProof,
                bookingId: proof.bookingId,
                travelerEmail: proof.booking.traveler?.email,
                tripTitle: updatedBooking.session.template.title,
                locale: updatedBooking.locale,
                fullyPaid: false,
            };
        });

        if (result.fullyPaid && result.travelerEmail) {
            // #436 (Council P1-10): awaited — an un-awaited send races the
            // serverless freeze after the response returns (#409). The
            // failure is logged, never thrown: the review already settled.
            await this.emailService.sendPaymentConfirmation(
                result.travelerEmail,
                result.tripTitle,
                result.locale,
            ).catch((err) => console.error('Failed to send payment confirmation email', err));
        }

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            // #422: the audit action names the step that actually happened
            // (proof accepted / proof rejected) — never "verified", which
            // is reserved for bank confirmation.
            action: status === 'VERIFIED' ? 'PAYMENT_PROOF_ACCEPTED' : 'PAYMENT_PROOF_REJECTED',
            targetType: 'PaymentProof',
            targetId: result.updatedProof.id,
            metadata: {
                status,
                bookingId: result.bookingId,
            },
        }).catch((err) => console.error('Audit log failed', err));

        return result.updatedProof;
    }

    async verifyAgency(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED') {
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid agency verification status');
        }
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: { verificationStatus: status }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_VERIFIED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async verifyAgencyLicence(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; ministryChecked?: boolean },
    ) {
        const status = body?.status;
        if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid licence verification status');
        }
        const agency = await this.db.agencyProfile.findUnique({
            where: { id },
            select: {
                id: true,
                travelLicenceType: true,
                travelLicenceNumber: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
                licenceIssuedAt: true,
                licenceIssuingAuthority: true,
                licenceDocumentKey: true,
            },
        });
        if (!agency) {
            throw new BadRequestException('Agency not found');
        }
        if (status === 'VERIFIED') {
            // #415: verification is evidence-based, not a self-typed
            // string — the licence document must be on file, an expiry
            // must be recorded and in the future, and the admin must
            // attest that the licence was checked against the Ministry
            // list (manual attestation; the stamp records who/when).
            if (!agency.travelLicenceNumber) {
                throw new BadRequestException('Agency has not submitted a travel licence number');
            }
            if (!agency.travelLicenceType) {
                throw new BadRequestException('Agency has not submitted a travel licence type (ODV/DV)');
            }
            if (!agency.licenceDocumentKey) {
                throw new BadRequestException('Agency has not uploaded a travel licence document');
            }
            if (!agency.licenceExpiry) {
                throw new BadRequestException('Travel licence expiry is required before verification');
            }
            if (agency.licenceExpiry.getTime() <= Date.now()) {
                throw new BadRequestException('Travel licence has already expired; ask the agency to renew it before verification');
            }
            // B4: the Law 31-08 seller block renders the licence issue
            // date and issuing authority — a licence cannot be marked
            // VERIFIED until both are on the record.
            if (!agency.licenceIssuedAt) {
                throw new BadRequestException('Licence issue date is required before verification');
            }
            if (!agency.licenceIssuingAuthority?.trim()) {
                throw new BadRequestException('Licence issuing authority is required before verification');
            }
            if (body.ministryChecked !== true) {
                throw new BadRequestException('Ministry-list check attestation (ministryChecked) is required to verify a licence');
            }
        }
        const verifiedAt = new Date();
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                travelLicenceStatus: status,
                licenceVerifiedAt: status === 'VERIFIED' ? verifiedAt : null,
                licenceRejectionReason: status === 'REJECTED' ? (body.reason?.trim() || null) : null,
                licenceMinistryCheckedAt: status === 'VERIFIED' ? verifiedAt : null,
                licenceMinistryCheckedBy: status === 'VERIFIED' ? (req?.user?.userId ?? null) : null,
            },
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: status === 'VERIFIED' ? 'AGENCY_LICENCE_VERIFIED' : 'AGENCY_LICENCE_REJECTED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: {
                status,
                licenceNumber: agency.travelLicenceNumber,
                licenceDocumentKey: agency.licenceDocumentKey,
                licenceIssuedAt: agency.licenceIssuedAt,
                licenceIssuingAuthority: agency.licenceIssuingAuthority,
                ministryChecked: status === 'VERIFIED' ? true : undefined,
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async verifyAgencyInsurance(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; overrideReason?: string },
    ) {
        const status = body?.status;
        if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid insurance verification status');
        }
        const agency = await this.db.agencyProfile.findUnique({
            where: { id },
            select: {
                id: true,
                insuranceInsurer: true,
                insurancePolicyNumber: true,
                insuranceInsuredName: true,
                insuranceExpiry: true,
                insuranceCertificateKey: true,
                legalName: true,
                companyName: true,
            },
        });
        if (!agency) {
            throw new BadRequestException('Agency not found');
        }
        if (status === 'VERIFIED') {
            // #415: mirrors the hardened licence rules — the artefact
            // must be complete, the certificate on file, and the cover
            // must have a recorded, future expiry.
            if (!agency.insurancePolicyNumber) {
                throw new BadRequestException('Agency has not submitted an insurance policy number');
            }
            if (!agency.insuranceInsurer) {
                throw new BadRequestException('Agency has not submitted an insurer');
            }
            if (!agency.insuranceInsuredName) {
                throw new BadRequestException('Agency has not submitted the insured legal name');
            }
            if (!agency.insuranceCertificateKey) {
                throw new BadRequestException('Agency has not uploaded an RC insurance certificate');
            }
            if (!agency.insuranceExpiry) {
                throw new BadRequestException('Insurance expiry is required before verification');
            }
            if (agency.insuranceExpiry.getTime() <= Date.now()) {
                throw new BadRequestException('RC insurance has already expired; ask the agency to renew it before verification');
            }
        }
        // #628 (Council S4, B18 part (i)): the RC policy must cover the
        // agency itself — the insured name on the certificate must match
        // the agency legal name (legalName, falling back to the trade
        // name), mirroring the #421 bank-holder comparison. A mismatch
        // blocks verification unless the admin records an override
        // reason — group policies and trade-name cover exist, silent
        // passes do not. The decision (match or override) is written to
        // the audit log either way.
        let insuredNameMatches: boolean | null = null;
        let insuranceOverrideReason: string | null = null;
        if (status === 'VERIFIED') {
            const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
            const insured = normalize(agency.insuranceInsuredName || '');
            insuredNameMatches = [agency.legalName, agency.companyName]
                .filter((name): name is string => !!name && name.trim().length > 0)
                .some((name) => normalize(name) === insured);
            insuranceOverrideReason = body.overrideReason?.trim() || null;
            if (!insuredNameMatches && !insuranceOverrideReason) {
                throw new BadRequestException(
                    'Insured name does not match the agency legal name; record an override reason to verify anyway',
                );
            }
        }
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                insuranceStatus: status,
                insuranceVerifiedAt: status === 'VERIFIED' ? new Date() : null,
                insuranceRejectionReason: status === 'REJECTED' ? (body.reason?.trim() || null) : null,
            },
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: status === 'VERIFIED' ? 'AGENCY_INSURANCE_VERIFIED' : 'AGENCY_INSURANCE_REJECTED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: {
                status,
                insurancePolicyNumber: agency.insurancePolicyNumber,
                insuranceCertificateKey: agency.insuranceCertificateKey,
                ...(status === 'VERIFIED' ? {
                    insuranceInsuredName: agency.insuranceInsuredName,
                    insuredNameMatches,
                    overrideReason: insuranceOverrideReason,
                } : {}),
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async resolveDuplicateCreditFlag(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'RESOLVED' | 'DISMISSED'; resolutionNote?: string },
    ) {
        const status = body?.status ?? 'RESOLVED';
        if (!['RESOLVED', 'DISMISSED'].includes(status)) {
            throw new BadRequestException('Invalid duplicate-credit flag resolution status');
        }
        const flag = await this.db.duplicateCreditFlag.findUnique({ where: { id } });
        if (!flag) {
            throw new BadRequestException('Duplicate credit flag not found');
        }
        if (flag.status !== 'OPEN') {
            throw new BadRequestException('Duplicate credit flag is already closed');
        }
        const updated = await this.db.duplicateCreditFlag.update({
            where: { id },
            data: {
                status,
                resolvedBy: req.user.userId,
                resolvedAt: new Date(),
                resolutionNote: body?.resolutionNote?.trim() || null,
            },
        });
        this.auditLogService.log({
            actorId: req.user.userId,
            actorEmail: req.user.email,
            action: 'DUPLICATE_CREDIT_FLAG_CLOSED',
            targetType: 'DuplicateCreditFlag',
            targetId: id,
            metadata: { status, bookingId: flag.bookingId, agencyId: flag.agencyId },
        }).catch((err) => console.error('Audit log failed', err));
        return serializeDuplicateCreditFlag(updated);
    }

    async verifyAgencyBankDetails(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; overrideReason?: string },
    ) {
        const status = body?.status;
        if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid bank details verification status');
        }
        const agency = await this.db.agencyProfile.findUnique({
            where: { id },
            select: {
                id: true,
                bankDetails: true,
                pendingBankDetails: true,
                bankAccountHolderName: true,
                bankAttestationUrl: true,
                legalName: true,
                companyName: true,
                bankDetailsVerifiedAt: true,
            },
        });
        if (!agency) {
            throw new BadRequestException('Agency not found');
        }
        if (!agency.pendingBankDetails) {
            throw new BadRequestException('Agency has no bank details pending review');
        }

        if (status === 'VERIFIED') {
            // #421: the submitted account holder must be the agency
            // itself. A holder-name mismatch against the legal/trade
            // name blocks verification (a third-party RIB must fail)
            // unless the admin records an override reason — trade-name
            // accounts exist, silent passes do not.
            const holder = (agency.bankAccountHolderName || '').trim();
            if (!holder) {
                throw new BadRequestException('Agency has not submitted a bank account holder name');
            }
            const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
            const holderMatches = [agency.legalName, agency.companyName]
                .filter((name): name is string => !!name && name.trim().length > 0)
                .some((name) => normalize(name) === normalize(holder));
            const overrideReason = body.overrideReason?.trim() || null;
            if (!holderMatches && !overrideReason) {
                throw new BadRequestException(
                    'Bank account holder name does not match the agency legal name; record an override reason to verify anyway',
                );
            }
            const updated = await this.db.agencyProfile.update({
                where: { id },
                data: {
                    // Promote the reviewed submission to the live,
                    // traveller-visible destination.
                    bankDetails: agency.pendingBankDetails,
                    pendingBankDetails: null,
                    bankDetailsStatus: 'VERIFIED',
                    bankDetailsVerifiedAt: new Date(),
                    bankDetailsVerifiedBy: req?.user?.userId ?? null,
                    bankDetailsRejectionReason: null,
                },
            });
            this.auditLogService.log({
                actorId: req?.user?.userId,
                actorEmail: req?.user?.email,
                action: 'AGENCY_BANK_DETAILS_VERIFIED',
                targetType: 'AgencyProfile',
                targetId: id,
                metadata: { status, holderName: holder, holderMatches, overrideReason },
            }).catch((err) => console.error('Audit log failed', err));
            return updated;
        }

        const reason = body.reason?.trim();
        if (!reason) {
            throw new BadRequestException('A reason is required to reject bank details');
        }
        // A rejected REPLACEMENT does not take a verified destination
        // offline: the live details and their verified standing remain.
        const keepsVerifiedDestination = !!agency.bankDetails && !!agency.bankDetailsVerifiedAt;
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                pendingBankDetails: null,
                bankDetailsStatus: keepsVerifiedDestination ? 'VERIFIED' : 'REJECTED',
                bankDetailsRejectionReason: reason,
            },
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_BANK_DETAILS_REJECTED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: { status, reason, keepsVerifiedDestination },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async verifyAgencyCashPlus(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string; overrideReason?: string },
    ) {
        const status = body?.status;
        if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid Cash Plus verification status');
        }
        const agency = await this.db.agencyProfile.findUnique({
            where: { id },
            select: {
                id: true,
                cashPlusBeneficiaryName: true,
                pendingCashPlusBeneficiaryName: true,
                pendingCashPlusPhone: true,
                legalName: true,
                companyName: true,
                cashPlusVerifiedAt: true,
            },
        });
        if (!agency) {
            throw new BadRequestException('Agency not found');
        }
        if (!agency.pendingCashPlusBeneficiaryName || !agency.pendingCashPlusPhone) {
            throw new BadRequestException('Agency has no Cash Plus infos pending review');
        }

        if (status === 'VERIFIED') {
            // #988: same rule as bank details (#421) — the Cash Plus
            // beneficiary must be the agency itself. A beneficiary-name
            // mismatch against the legal/trade name blocks verification
            // unless the admin records an override reason.
            const beneficiary = agency.pendingCashPlusBeneficiaryName.trim();
            const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
            const beneficiaryMatches = [agency.legalName, agency.companyName]
                .filter((name): name is string => !!name && name.trim().length > 0)
                .some((name) => normalize(name) === normalize(beneficiary));
            const overrideReason = body.overrideReason?.trim() || null;
            if (!beneficiaryMatches && !overrideReason) {
                throw new BadRequestException(
                    'Cash Plus beneficiary name does not match the agency legal name; record an override reason to verify anyway',
                );
            }
            const updated = await this.db.agencyProfile.update({
                where: { id },
                data: {
                    // Promote the reviewed submission to the live,
                    // traveller-visible Cash Plus destination.
                    cashPlusBeneficiaryName: agency.pendingCashPlusBeneficiaryName,
                    cashPlusPhone: agency.pendingCashPlusPhone,
                    pendingCashPlusBeneficiaryName: null,
                    pendingCashPlusPhone: null,
                    cashPlusStatus: 'VERIFIED',
                    cashPlusVerifiedAt: new Date(),
                    cashPlusVerifiedBy: req?.user?.userId ?? null,
                    cashPlusRejectionReason: null,
                },
            });
            this.auditLogService.log({
                actorId: req?.user?.userId,
                actorEmail: req?.user?.email,
                action: 'AGENCY_CASH_PLUS_VERIFIED',
                targetType: 'AgencyProfile',
                targetId: id,
                metadata: { status, beneficiaryMatches, overrideReason },
            }).catch((err) => console.error('Audit log failed', err));
            return updated;
        }

        const reason = body.reason?.trim();
        if (!reason) {
            throw new BadRequestException('A reason is required to reject Cash Plus infos');
        }
        // A rejected REPLACEMENT does not take a verified destination
        // offline: the live infos and their verified standing remain.
        const keepsVerifiedDestination = !!agency.cashPlusBeneficiaryName && !!agency.cashPlusVerifiedAt;
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                pendingCashPlusBeneficiaryName: null,
                pendingCashPlusPhone: null,
                cashPlusStatus: keepsVerifiedDestination ? 'VERIFIED' : 'REJECTED',
                cashPlusRejectionReason: reason,
            },
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_CASH_PLUS_REJECTED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: { status, reason, keepsVerifiedDestination },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async verifyTrip(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body('status') status: 'ACTIVE' | 'ARCHIVED') {
        if (!['ACTIVE', 'ARCHIVED'].includes(status)) {
            throw new BadRequestException('Invalid trip status');
        }
        const trip = await this.db.tripTemplate.findUnique({
            where: { id },
            include: { agency: true },
        });
        if (!trip) throw new BadRequestException('Trip not found');
        if (status === 'ACTIVE') {
            const now = new Date();
            const subscriptionValid = trip.agency.subscriptionStatus === 'ACTIVE'
                ? !trip.agency.subscriptionEndsAt || trip.agency.subscriptionEndsAt > now
                : trip.agency.subscriptionStatus === 'TRIAL'
                    && !!trip.agency.trialEndsAt
                    && trip.agency.trialEndsAt > now;
            if (trip.agency.verificationStatus !== 'VERIFIED' || !subscriptionValid) {
                throw new BadRequestException('Agency must be verified with an active subscription or trial');
            }
            // #371: publishing also requires a verified, unexpired travel
            // licence (Law 11-16) — identity verification alone is not
            // enough. #415: the shared activation block also requires
            // verified, unexpired RC insurance.
            const licenceBlock = getAgencyActivationBlock(trip.agency);
            if (licenceBlock) {
                throw new BadRequestException(licenceBlock);
            }
        }
        const updated = await this.db.tripTemplate.update({
            where: { id },
            data: { status: status }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'TRIP_VERIFIED',
            targetType: 'TripTemplate',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async updateAgencyStatus(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() data: { verificationStatus?: VerificationStatusType; subscriptionStatus?: SubscriptionStatusType },
    ) {
        if (!data.verificationStatus && !data.subscriptionStatus) {
            throw new BadRequestException('At least one agency status is required');
        }
        if (data.verificationStatus && !VERIFICATION_STATUSES.includes(data.verificationStatus)) {
            throw new BadRequestException('Invalid agency verification status');
        }
        if (data.subscriptionStatus && !SUBSCRIPTION_STATUSES.includes(data.subscriptionStatus)) {
            throw new BadRequestException('Invalid agency subscription status');
        }
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus
            }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_STATUS_UPDATED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus,
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    async refundBooking(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body('amount') amount?: MoneyInput,
    ) {
        const result = await this.paymentsService.refundBookingById(id, amount);

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'BOOKING_REFUNDED',
            targetType: 'Booking',
            targetId: id,
            metadata: {
                amount,
                result,
            },
        }).catch((err) => console.error('Audit log failed', err));

        return result;
    }
}
