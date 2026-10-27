import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { PRIVATE_FILE_PREFIX } from '../upload/upload.constants';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UsersService {
    constructor(private db: DatabaseService) { }

    private sanitizeUser(user: any) {
        if (!user) {
            return user;
        }

        const safeUser = { ...user };
        delete safeUser.password;
        delete safeUser.passwordResetTokenHash;
        delete safeUser.passwordResetExpiresAt;
        delete safeUser.passwordResetSentAt;
        delete safeUser.otp;
        delete safeUser.otpExpiresAt;
        delete safeUser.otpLastSentAt;

        return safeUser;
    }

    async findOne(id: string) {
        const user = await this.db.user.findUnique({
            where: { id },
            include: {
                agencyProfile: true,
            },
        });

        return this.sanitizeUser(user);
    }

    async updateUserProfile(userId: string, data: UpdateUserProfileDto) {
        const user = await this.db.user.update({
            where: { id: userId },
            data,
            include: {
                agencyProfile: true,
            },
        });

        return this.sanitizeUser(user);
    }

    /**
     * #415: verification documents (licence scan, RC certificate) are
     * private identity-document uploads. The client submits only the
     * storage key, and it must point at the agency's own private folder
     * (private/{userId}/…) — arbitrary keys/URLs are rejected so one
     * agency can never attach another user's document.
     */
    private assertOwnPrivateDocumentKey(userId: string, key: unknown, field: string) {
        if (key === undefined || key === null || key === '') {
            return;
        }
        const prefix = `${PRIVATE_FILE_PREFIX}/${userId}/`;
        if (typeof key !== 'string' || !key.startsWith(prefix)) {
            throw new BadRequestException(`${field} must reference a private document uploaded by this agency`);
        }
    }

    async updateAgencyProfile(userId: string, data: any) {
        // #371/#415: licence & insurance status fields are server-managed
        // — an agency can submit details and documents, but only an admin
        // verification can mark them VERIFIED, and only an admin action
        // can stamp the Ministry check or the auto-pause marker. Strip
        // any client-supplied managed fields.
        const {
            travelLicenceStatus: _ignoredStatus,
            licenceVerifiedAt: _ignoredVerifiedAt,
            licenceRejectionReason: _ignoredReason,
            licenceMinistryCheckedAt: _ignoredMinistryAt,
            licenceMinistryCheckedBy: _ignoredMinistryBy,
            insuranceStatus: _ignoredInsuranceStatus,
            insuranceVerifiedAt: _ignoredInsuranceVerifiedAt,
            insuranceRejectionReason: _ignoredInsuranceReason,
            verificationPausedAt: _ignoredPausedAt,
            verificationPauseReason: _ignoredPauseReason,
            ...safeData
        } = data ?? {};

        this.assertOwnPrivateDocumentKey(userId, safeData.licenceDocumentKey, 'licenceDocumentKey');
        this.assertOwnPrivateDocumentKey(userId, safeData.insuranceCertificateKey, 'insuranceCertificateKey');

        const existing = await this.db.agencyProfile.findUnique({
            where: { userId },
            select: {
                travelLicenceType: true,
                travelLicenceNumber: true,
                licenceExpiry: true,
                licenceIssuedAt: true,
                licenceIssuingAuthority: true,
                travelLicenceStatus: true,
                licenceDocumentKey: true,
                insuranceInsurer: true,
                insurancePolicyNumber: true,
                insuranceInsuredName: true,
                insuranceValidFrom: true,
                insuranceExpiry: true,
                insuranceCoverageLimit: true,
                insuranceCertificateKey: true,
                insuranceStatus: true,
            },
        });

        const licenceTouched = ['travelLicenceType', 'travelLicenceNumber', 'licenceExpiry', 'licenceIssuedAt', 'licenceIssuingAuthority', 'licenceDocumentKey', 'licenceDocumentName']
            .some((key) => safeData[key] !== undefined);
        if (licenceTouched) {
            const nextNumber = safeData.travelLicenceNumber !== undefined
                ? (safeData.travelLicenceNumber || null)
                : existing?.travelLicenceNumber ?? null;
            const nextType = safeData.travelLicenceType !== undefined
                ? (safeData.travelLicenceType || null)
                : existing?.travelLicenceType ?? null;
            const nextExpiry = safeData.licenceExpiry !== undefined
                ? (safeData.licenceExpiry ? new Date(safeData.licenceExpiry) : null)
                : existing?.licenceExpiry ?? null;
            // B4: issue date + issuing authority join the completeness
            // rule — the seller block cannot be rendered without them.
            const nextIssuedAt = safeData.licenceIssuedAt !== undefined
                ? (safeData.licenceIssuedAt ? new Date(safeData.licenceIssuedAt) : null)
                : existing?.licenceIssuedAt ?? null;
            const nextIssuingAuthority = safeData.licenceIssuingAuthority !== undefined
                ? (safeData.licenceIssuingAuthority?.trim() || null)
                : existing?.licenceIssuingAuthority ?? null;
            const nextDocumentKey = safeData.licenceDocumentKey !== undefined
                ? (safeData.licenceDocumentKey || null)
                : existing?.licenceDocumentKey ?? null;
            const changed = !existing
                || nextNumber !== (existing.travelLicenceNumber ?? null)
                || nextType !== (existing.travelLicenceType ?? null)
                || (nextExpiry?.getTime() ?? null) !== (existing.licenceExpiry?.getTime() ?? null)
                || (nextIssuedAt?.getTime() ?? null) !== (existing.licenceIssuedAt?.getTime() ?? null)
                || nextIssuingAuthority !== (existing.licenceIssuingAuthority ?? null)
                || nextDocumentKey !== (existing.licenceDocumentKey ?? null);
            if (changed) {
                // #415: a licence submission is reviewable only when it
                // is complete — number + type + expiry + uploaded
                // document. Clearing the number withdraws the
                // submission; an incomplete submission stays
                // NOT_SUBMITTED. Any change also voids the previous
                // Ministry-check stamp (it attested the old details).
                // B4: issue date + issuing authority are part of
                // "complete" — a legacy VERIFIED agency that edits any
                // licence field without supplying them goes back to
                // review until the seller block can be completed.
                const complete = Boolean(
                    nextNumber && nextType && nextExpiry && nextDocumentKey
                    && nextIssuedAt && nextIssuingAuthority,
                );
                safeData.travelLicenceStatus = complete ? 'PENDING_REVIEW' : 'NOT_SUBMITTED';
                safeData.licenceVerifiedAt = null;
                safeData.licenceRejectionReason = null;
                safeData.licenceMinistryCheckedAt = null;
                safeData.licenceMinistryCheckedBy = null;
            }
            if (safeData.licenceExpiry !== undefined) {
                safeData.licenceExpiry = nextExpiry;
            }
            if (safeData.licenceIssuedAt !== undefined) {
                safeData.licenceIssuedAt = nextIssuedAt;
            }
            if (safeData.licenceIssuingAuthority !== undefined) {
                safeData.licenceIssuingAuthority = nextIssuingAuthority;
            }
        }

        const insuranceFields = [
            'insuranceInsurer', 'insurancePolicyNumber', 'insuranceInsuredName',
            'insuranceValidFrom', 'insuranceExpiry', 'insuranceCoverageLimit',
            'insuranceCertificateKey',
        ] as const;
        const insuranceTouched = insuranceFields.some((key) => safeData[key] !== undefined);
        if (insuranceTouched) {
            const next = {} as Record<(typeof insuranceFields)[number], any>;
            for (const key of insuranceFields) {
                if (safeData[key] !== undefined) {
                    next[key] = (key === 'insuranceValidFrom' || key === 'insuranceExpiry')
                        ? (safeData[key] ? new Date(safeData[key]) : null)
                        : (safeData[key] ?? null);
                } else {
                    next[key] = existing?.[key] ?? null;
                }
            }
            const toTime = (v: any) => (v instanceof Date ? v.getTime() : v ?? null);
            const changed = !existing || insuranceFields.some((key) => {
                const a = next[key];
                const b = existing?.[key] ?? null;
                return (a instanceof Date || b instanceof Date) ? toTime(a) !== toTime(b) : String(a ?? '') !== String(b ?? '');
            });
            if (changed) {
                // #415: same lifecycle as the licence — complete
                // submissions (insurer + policy number + insured name +
                // expiry + certificate) go to PENDING_REVIEW; clearing
                // the policy number or submitting a partial artefact
                // leaves the insurance NOT_SUBMITTED.
                const complete = Boolean(
                    next.insuranceInsurer && next.insurancePolicyNumber
                    && next.insuranceInsuredName && next.insuranceExpiry
                    && next.insuranceCertificateKey,
                );
                safeData.insuranceStatus = complete ? 'PENDING_REVIEW' : 'NOT_SUBMITTED';
                safeData.insuranceVerifiedAt = null;
                safeData.insuranceRejectionReason = null;
            }
            for (const key of ['insuranceValidFrom', 'insuranceExpiry'] as const) {
                if (safeData[key] !== undefined) {
                    safeData[key] = next[key];
                }
            }
        }

        return this.db.agencyProfile.upsert({
            where: { userId },
            update: safeData,
            create: {
                ...safeData,
                userId,
            },
        });
    }

    async getMe(userId: string) {
        return this.findOne(userId);
    }

    async exportUserData(userId: string) {
        const user = await this.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, role: true, avatar: true,
                isEmailVerified: true, displayCurrency: true, createdAt: true, updatedAt: true,
                agencyProfile: { include: { wallet: { include: { transactions: true } }, payoutRequests: true, templates: { include: { itinerary: true, sessions: true } } } },
                bookings: { include: { paymentProof: true, paymentTransactions: true, review: true } },
                reviews: true, wishlist: true, notificationPreferences: true,
                travelerConversations: { include: { messages: true } },
            },
        });
        if (!user) throw new NotFoundException('User not found');
        const [notifications, auditLogs] = await Promise.all([
            this.db.notificationLog.findMany({ where: { userId }, orderBy: { sentAt: 'asc' } }),
            this.db.auditLog.findMany({ where: { actorId: userId }, orderBy: { createdAt: 'asc' } }),
        ]);
        return { exportedAt: new Date().toISOString(), subject: user, notifications, auditLogs };
    }

    async deleteUserAccount(userId: string) {
        const user = await this.db.user.findUnique({ where: { id: userId }, include: { agencyProfile: true } });
        if (!user) throw new NotFoundException('User not found');
        const tombstone = `deleted-${randomUUID()}`;
        await this.db.$transaction(async (tx) => {
            await tx.refreshToken.deleteMany({ where: { userId } });
            await tx.wishlist.deleteMany({ where: { userId } });
            await tx.notificationPreference.deleteMany({ where: { userId } });
            await tx.notificationLog.updateMany({ where: { userId }, data: { recipientEmail: `${tombstone}@privacy.invalid`, subject: null, message: '[deleted by data subject request]' } });
            await tx.auditLog.updateMany({ where: { actorId: userId }, data: { actorEmail: null } });
            await tx.booking.updateMany({ where: { travelerId: userId }, data: { fullName: null, phoneNumber: null, paymentProofUrl: null } });
            if (user.agencyProfile) {
                await tx.tripTemplate.updateMany({ where: { agencyId: user.agencyProfile.id }, data: { status: 'ARCHIVED' } });
                await tx.agencyProfile.update({ where: { id: user.agencyProfile.id }, data: { companyName: 'Deleted agency', ice: `${tombstone}-ice`, patente: 'DELETED', rib: 'DELETED', bio: null, logo: null, bankDetails: null, verificationStatus: 'REJECTED' } });
            }
            await tx.user.update({ where: { id: userId }, data: { email: `${tombstone}@privacy.invalid`, name: null, avatar: null, password: tombstone, isEmailVerified: false, otp: null, otpExpiresAt: null, otpLastSentAt: null, passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetSentAt: null } });
        });
    }
}
