import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UsersService {
    constructor(private db: DatabaseService) { }

    async findOne(id: string) {
        return this.db.user.findUnique({
            where: { id },
            include: {
                agencyProfile: true,
            },
        });
    }

    async updateUserProfile(userId: string, data: UpdateUserProfileDto) {
        return this.db.user.update({
            where: { id: userId },
            data,
            include: {
                agencyProfile: true,
            },
        });
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
