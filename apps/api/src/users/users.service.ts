import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
