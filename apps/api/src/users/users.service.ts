import { Injectable } from '@nestjs/common';
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
        return this.db.agencyProfile.upsert({
            where: { userId },
            update: data,
            create: {
                ...data,
                userId,
            },
        });
    }

    async getMe(userId: string) {
        return this.findOne(userId);
    }
}
