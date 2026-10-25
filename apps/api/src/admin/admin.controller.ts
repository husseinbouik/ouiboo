import { Controller, Get, Post, Body, Param, UseGuards, Patch, BadRequestException, Query, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
import { Response } from 'express';
import { mapBookingDetails } from '../bookings/booking-response.util';
import { PaymentsService } from '../payments/payments.service';
import { type MoneyInput } from '../common/money.util';
import { effectiveInsuranceStatus, effectiveLicenceStatus, getAgencyActivationBlock } from '../common/agency-licence.util';

const parseEnumQuery = <T extends string>(value: string | undefined, allowedValues: readonly T[]) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim().toUpperCase() as T;
    return allowedValues.includes(normalized) ? normalized : undefined;
};

const parseDateQuery = (value?: string) => {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parsePaginationQuery = (
    pageValue?: string,
    limitValue?: string,
    defaultLimit = 25,
    maxLimit = 100,
) => {
    const parsedLimit = Number(limitValue);
    const limit = clampNumber(Number.isFinite(parsedLimit) ? Math.floor(parsedLimit) : defaultLimit, 1, maxLimit);
    const parsedPage = Number(pageValue);
    const page = clampNumber(Number.isFinite(parsedPage) ? Math.floor(parsedPage) : 1, 1, 1_000_000);
    return { page, limit };
};

const buildPaginationMeta = (total: number, page: number, limit: number) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});

const buildAuditLogWhere = ({
    fromDate,
    toDate,
    action,
    actorEmail,
    targetType,
    search,
}: {
    fromDate?: Date;
    toDate?: Date;
    action?: string;
    actorEmail?: string;
    targetType?: string;
    search?: string;
}) => {
    const where: Record<string, any> = {};
    if (fromDate || toDate) {
        where.createdAt = {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
        };
    }
    if (action) {
        where.action = action;
    }
    if (actorEmail) {
        where.actorEmail = { contains: actorEmail, mode: 'insensitive' };
    }
    if (targetType) {
        where.targetType = targetType;
    }
    if (search) {
        where.OR = [
            { action: { contains: search, mode: 'insensitive' } },
            { actorEmail: { contains: search, mode: 'insensitive' } },
            { targetType: { contains: search, mode: 'insensitive' } },
            { targetId: { contains: search, mode: 'insensitive' } },
        ];
    }
    return where;
};

const escapeCsvValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

const VERIFICATION_STATUSES = Object.values(VerificationStatus) as VerificationStatusType[];
const SUBSCRIPTION_STATUSES = Object.values(SubscriptionStatus) as SubscriptionStatusType[];
const BOOKING_STATUSES = Object.values(BookingStatus) as BookingStatusType[];

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminController {
    constructor(
        private db: DatabaseService,
        private externalPaymentsService: ExternalPaymentsService,
        private stagedPaymentsService: StagedPaymentsService,
        private emailService: EmailService,
        private auditLogService: AuditLogService,
        private paymentsService: PaymentsService,
    ) { }

    @Get('pending-payments')
    @ApiOperation({ summary: 'Get payment proofs pending verification' })
    async getPendingPayments(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.PaymentProofWhereInput = {
            status: 'PENDING',
            ...(search ? {
                OR: [
                    { booking: { id: { contains: search, mode: 'insensitive' } } },
                    { booking: { traveler: { name: { contains: search, mode: 'insensitive' } } } },
                    { booking: { traveler: { email: { contains: search, mode: 'insensitive' } } } },
                    { booking: { session: { template: { title: { contains: search, mode: 'insensitive' } } } } },
                ],
            } : {}),
        };
        const [proofs, total] = await Promise.all([
            this.db.paymentProof.findMany({
                where,
                include: {
                    booking: {
                        include: {
                            traveler: { select: { email: true, name: true } },
                            session: { include: { template: true } },
                        },
                    },
                },
                orderBy: { uploadedAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.paymentProof.count({ where }),
        ]);
        const apiUrl = (process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

        const data = proofs.map((proof) => ({
            ...proof,
            booking: mapBookingDetails(proof.booking),
            downloadUrl: `${apiUrl}/bookings/${proof.bookingId}/payment-proof/download`,
        }));
        return { data, pagination: buildPaginationMeta(total, safePage, safeLimit) };
    }

    @Post('payments/:id/verify')
    @ApiOperation({ summary: 'Accept or reject a payment proof image (acceptance is not settlement, #422)' })
    async verifyPayment(
        @Request() req,
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
                fullyPaid: false,
            };
        });

        if (result.fullyPaid && result.travelerEmail) {
            this.emailService.sendPaymentConfirmation(
                result.travelerEmail,
                result.tripTitle,
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

    @Get('overview-counts')
    @ApiOperation({ summary: 'Get lightweight counts for the admin dashboard' })
    async getOverviewCounts() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
            pendingAgencies,
            pendingTrips,
            agencies,
            bookings,
            bookingsToday,
            pendingPaymentProofs,
            auditLogs,
        ] = await Promise.all([
            this.db.agencyProfile.count({ where: { verificationStatus: 'PENDING' } }),
            this.db.tripTemplate.count({ where: { status: 'DRAFT' } }),
            this.db.agencyProfile.count(),
            this.db.booking.count(),
            this.db.booking.count({ where: { bookingDate: { gte: startOfToday } } }),
            this.db.paymentProof.count({ where: { status: 'PENDING' } }),
            this.db.auditLog.count(),
        ]);

        return {
            pendingAgencies,
            pendingTrips,
            agencies,
            bookings,
            bookingsToday,
            pendingPaymentProofs,
            auditLogs,
        };
    }

    @Get('pending-agencies')
    @ApiOperation({ summary: 'Get agencies pending verification' })
    async getPendingAgencies(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.AgencyProfileWhereInput = {
            verificationStatus: 'PENDING',
            ...(search ? {
                OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { ice: { contains: search, mode: 'insensitive' } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        };
        const [agencies, total] = await Promise.all([
            this.db.agencyProfile.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true, isEmailVerified: true } } },
                orderBy: { id: 'asc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.agencyProfile.count({ where }),
        ]);
        // #371: surface the derived licence status so an expired licence is
        // flagged in admin even when the stored value still says VERIFIED.
        // #415: same for the RC insurance artefact.
        return {
            data: agencies.map((agency) => ({
                ...agency,
                effectiveLicenceStatus: effectiveLicenceStatus(agency),
                effectiveInsuranceStatus: effectiveInsuranceStatus(agency),
            })),
            pagination: buildPaginationMeta(total, safePage, safeLimit),
        };
    }

    @Post('agencies/:id/verify')
    @ApiOperation({ summary: 'Approve or reject agency' })
    async verifyAgency(@Request() req, @Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED') {
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

    @Post('agencies/:id/licence/verify')
    @ApiOperation({ summary: 'Verify or reject an agency travel licence (#371, hardened by #415)' })
    async verifyAgencyLicence(
        @Request() req,
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
                ministryChecked: status === 'VERIFIED' ? true : undefined,
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    @Post('agencies/:id/insurance/verify')
    @ApiOperation({ summary: 'Verify or reject an agency RC insurance artefact (#415)' })
    async verifyAgencyInsurance(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { status?: 'VERIFIED' | 'REJECTED'; reason?: string },
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
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    @Post('agencies/:id/bank-details/verify')
    @ApiOperation({ summary: 'Verify or reject an agency bank payment destination (#421)' })
    async verifyAgencyBankDetails(
        @Request() req,
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

    @Get('pending-trips')
    @ApiOperation({ summary: 'Get trips pending verification' })
    async getPendingTrips(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.TripTemplateWhereInput = {
            status: 'DRAFT',
            ...(search ? {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { agency: { companyName: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        }; // Assuming Draft is what they start as
        const [trips, total] = await Promise.all([
            this.db.tripTemplate.findMany({
                where,
                include: { agency: true },
                orderBy: { createdAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.tripTemplate.count({ where }),
        ]);
        return { data: trips, pagination: buildPaginationMeta(total, safePage, safeLimit) };
    }

    @Post('trips/:id/verify')
    @ApiOperation({ summary: 'Approve or reject trip' })
    async verifyTrip(@Request() req, @Param('id') id: string, @Body('status') status: 'ACTIVE' | 'ARCHIVED') {
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
            // licence (Law 11-16) — identity verification alone is not enough.
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

    @Get('agencies')
    @ApiOperation({ summary: 'Get all agencies' })
    async getAgencies(
        @Query('q') q?: string,
        @Query('verificationStatus') verificationStatus?: string,
        @Query('subscriptionStatus') subscriptionStatus?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const verificationFilter = parseEnumQuery(verificationStatus, VERIFICATION_STATUSES);
        const subscriptionFilter = parseEnumQuery(subscriptionStatus, SUBSCRIPTION_STATUSES);
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.AgencyProfileWhereInput = {
            ...(verificationFilter ? { verificationStatus: verificationFilter } : {}),
            ...(subscriptionFilter ? { subscriptionStatus: subscriptionFilter } : {}),
            ...(search ? {
                OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { ice: { contains: search, mode: 'insensitive' } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        };
        const [agencies, total] = await Promise.all([
            this.db.agencyProfile.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true, isEmailVerified: true } } },
                orderBy: { id: 'asc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.agencyProfile.count({ where }),
        ]);
        // #371: derived licence status (expired licences flagged on read).
        // #415: derived insurance status alongside it.
        return {
            data: agencies.map((agency) => ({
                ...agency,
                effectiveLicenceStatus: effectiveLicenceStatus(agency),
                effectiveInsuranceStatus: effectiveInsuranceStatus(agency),
            })),
            pagination: buildPaginationMeta(total, safePage, safeLimit),
        };
    }

    @Patch('agencies/:id/status')
    @ApiOperation({ summary: 'Update agency verification or subscription status' })
    async updateAgencyStatus(
        @Request() req,
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

    @Get('bookings')
    @ApiOperation({ summary: 'Get all bookings in the system' })
    async getBookings(
        @Query('q') q?: string,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const statusFilter = parseEnumQuery(status, BOOKING_STATUSES);
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.BookingWhereInput = {
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(search ? {
                OR: [
                    { id: { contains: search, mode: 'insensitive' } },
                    { traveler: { name: { contains: search, mode: 'insensitive' } } },
                    { traveler: { email: { contains: search, mode: 'insensitive' } } },
                    { session: { template: { title: { contains: search, mode: 'insensitive' } } } },
                ],
            } : {}),
        };
        const [bookings, total] = await Promise.all([
            this.db.booking.findMany({
                where,
                include: {
                    traveler: {
                        select: {
                            email: true,
                            name: true,
                        },
                    },
                    session: {
                        include: {
                            template: {
                                include: {
                                    agency: true,
                                },
                            },
                        },
                    },
                    paymentProof: true
                },
                orderBy: { bookingDate: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.booking.count({ where }),
        ]);

        return {
            data: bookings.map(mapBookingDetails),
            pagination: buildPaginationMeta(total, safePage, safeLimit),
        };
    }

    @Post('bookings/:id/refund')
    @ApiOperation({ summary: 'Refund a paid gateway booking' })
    async refundBooking(
        @Request() req,
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

    @Get('audit-logs')
    @ApiOperation({ summary: 'List audit logs with optional filters' })
    async getAuditLogs(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('actorEmail') actorEmail?: string,
        @Query('targetType') targetType?: string,
        @Query('q') q?: string,
        @Query('limit') limit?: string,
        @Query('page') page?: string,
    ) {
        const fromDate = parseDateQuery(from);
        const toDate = parseDateQuery(to);
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit, 100, 200);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
            search: q?.trim(),
        });

        const [logs, total] = await Promise.all([
            this.db.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.auditLog.count({ where }),
        ]);

        return { data: logs, pagination: buildPaginationMeta(total, safePage, safeLimit) };
    }

    @Get('audit-logs/export')
    @ApiOperation({ summary: 'Export audit logs as CSV' })
    async exportAuditLogs(
        @Request() req,
        @Res() res: Response,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('actorEmail') actorEmail?: string,
        @Query('targetType') targetType?: string,
        @Query('q') q?: string,
        @Query('limit') limit?: string,
    ) {
        const fromDate = parseDateQuery(from);
        const toDate = parseDateQuery(to);
        const parsedLimit = Number(limit);
        const take = clampNumber(Number.isFinite(parsedLimit) ? Math.floor(parsedLimit) : 1000, 1, 5000);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
            search: q?.trim(),
        });
        const logs = await this.db.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
        });

        const header = ['id', 'createdAt', 'actorId', 'actorEmail', 'action', 'targetType', 'targetId', 'metadata'];
        const rows = logs.map((log) => [
            log.id,
            log.createdAt.toISOString(),
            log.actorId || '',
            log.actorEmail || '',
            log.action,
            log.targetType,
            log.targetId || '',
            log.metadata ? JSON.stringify(log.metadata) : '',
        ]);
        const csv = [header.join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))].join('\n');

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AUDIT_LOG_EXPORTED',
            targetType: 'AuditLog',
            metadata: {
                from,
                to,
                action,
                actorEmail,
                targetType,
                q,
                count: logs.length,
            },
        }).catch((err) => console.error('Audit log failed', err));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send(csv);
    }

    @Post('audit-logs/retention')
    @ApiOperation({ summary: 'Prune audit logs older than a retention window' })
    async pruneAuditLogs(
        @Request() req,
        @Body('days') days?: number,
    ) {
        const parsedDays = Number(days ?? process.env.AUDIT_LOG_RETENTION_DAYS);
        if (!Number.isFinite(parsedDays) || parsedDays < 1) {
            throw new BadRequestException('Retention days must be a positive number.');
        }
        const cutoff = new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000);
        const result = await this.db.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AUDIT_LOG_PRUNED',
            targetType: 'AuditLog',
            metadata: {
                retentionDays: parsedDays,
                deleted: result.count,
                cutoff: cutoff.toISOString(),
            },
        }).catch((err) => console.error('Audit log failed', err));

        return {
            deleted: result.count,
            cutoff,
        };
    }
}
