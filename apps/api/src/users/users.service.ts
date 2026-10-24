import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
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

    async updateAgencyProfile(userId: string, data: any) {
        // #371: licence status fields are server-managed — an agency can
        // submit licence details, but only an admin verification can mark
        // them VERIFIED. Strip any client-supplied status fields.
        const {
            travelLicenceStatus: _ignoredStatus,
            licenceVerifiedAt: _ignoredVerifiedAt,
            licenceRejectionReason: _ignoredReason,
            ...safeData
        } = data ?? {};

        const existing = await this.db.agencyProfile.findUnique({
            where: { userId },
            select: {
                travelLicenceType: true,
                travelLicenceNumber: true,
                licenceExpiry: true,
                travelLicenceStatus: true,
            },
        });

        const licenceTouched = ['travelLicenceType', 'travelLicenceNumber', 'licenceExpiry']
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
            const changed = !existing
                || nextNumber !== (existing.travelLicenceNumber ?? null)
                || nextType !== (existing.travelLicenceType ?? null)
                || (nextExpiry?.getTime() ?? null) !== (existing.licenceExpiry?.getTime() ?? null);
            if (changed) {
                // New or changed licence details always go (back) to review;
                // clearing the licence number withdraws the submission.
                safeData.travelLicenceStatus = nextNumber ? 'PENDING_REVIEW' : 'NOT_SUBMITTED';
                safeData.licenceVerifiedAt = null;
                safeData.licenceRejectionReason = null;
            }
            if (safeData.licenceExpiry !== undefined) {
                safeData.licenceExpiry = nextExpiry;
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
            await tx.booking.updateMany({ where: { travelerId: userId }, data: { fullName: null, phoneNumber: null, documentNumber: null, paymentProofUrl: null } });
            if (user.agencyProfile) {
                await tx.tripTemplate.updateMany({ where: { agencyId: user.agencyProfile.id }, data: { status: 'ARCHIVED' } });
                await tx.agencyProfile.update({ where: { id: user.agencyProfile.id }, data: { companyName: 'Deleted agency', ice: `${tombstone}-ice`, patente: 'DELETED', rib: 'DELETED', bio: null, logo: null, bankDetails: null, verificationStatus: 'REJECTED' } });
            }
            await tx.user.update({ where: { id: userId }, data: { email: `${tombstone}@privacy.invalid`, name: null, avatar: null, password: tombstone, isEmailVerified: false, otp: null, otpExpiresAt: null, otpLastSentAt: null, passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetSentAt: null } });
        });
    }
}
