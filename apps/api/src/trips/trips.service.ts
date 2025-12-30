import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
    constructor(private db: DatabaseService) { }

    async createTemplate(agencyId: string, dto: CreateTripTemplateDto) {
        return this.db.tripTemplate.create({
            data: {
                ...dto,
                agencyId,
            },
        });
    }

    async findAllTemplates(featured?: boolean) {
        return this.db.tripTemplate.findMany({
            where: featured ? { featured: true } : {},
            include: {
                _count: {
                    select: { sessions: true },
                },
            },
        });
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
}
