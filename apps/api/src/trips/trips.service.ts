import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
    constructor(private db: DatabaseService) { }

    async createTemplate(userId: string, dto: CreateTripTemplateDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { userId }
        });

        if (!agency) {
            throw new Error('Agency profile not found');
        }

        return this.db.tripTemplate.create({
            data: {
                ...dto,
                agencyId: agency.id,
            },
        });
    }

    async findAllTemplates(featured?: boolean, status?: string) {
        try {
            const where: any = {};
            if (featured) where.featured = true;
            if (status) where.status = status;

            return await this.db.tripTemplate.findMany({
                where,
                include: {
                    sessions: {
                        where: {
                            status: 'OPEN',
                            startDate: { gte: new Date() }
                        },
                        orderBy: { startDate: 'asc' }
                    },
                    _count: {
                        select: { sessions: true },
                    },
                },
            });
        } catch (error) {
            console.error('Error in findAllTemplates:', error);
            throw error;
        }
    }

    async findOneTemplate(id: string) {
        return this.db.tripTemplate.findUnique({
            where: { id },
            include: {
                sessions: true,
                agency: true,
            },
        });
    }

    async createSession(templateId: string, dto: CreateTripSessionDto) {
        return this.db.tripSession.create({
            data: {
                ...dto,
                templateId,
                availableSeats: dto.totalSeats,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
        });
    }

    async findSessionsByTemplate(templateId: string) {
        return this.db.tripSession.findMany({
            where: { templateId },
        });
    }

    async updateTemplate(id: string, dto: Partial<CreateTripTemplateDto>) {
        return this.db.tripTemplate.update({
            where: { id },
            data: dto,
        });
    }

    async deleteTemplate(id: string) {
        // Delete sessions first or let prisma handle it with cascade
        return this.db.tripTemplate.delete({
            where: { id },
        });
    }
}
