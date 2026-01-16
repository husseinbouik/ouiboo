import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
    constructor(private db: DatabaseService) { }

    async createTemplate(agencyId: string, dto: CreateTripTemplateDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });

        if (!agency) {
            throw new ForbiddenException('Agency profile not found');
        }

        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Creating template. Itinerary count: ${itinerary?.length || 0}`);

        const data = {
            ...tripData,
            agencyId: agencyId,
            itinerary: itinerary && itinerary.length > 0 ? {
                create: itinerary
            } : undefined
        };

        console.log(`[TripsService] Prisma Create Data:`, JSON.stringify(data, null, 2));

        const result = await this.db.tripTemplate.create({
            data,
            include: {
                itinerary: true
            }
        });

        console.log(`[TripsService] Created template ${result.id} for agency ${agencyId}. Status: ${result.status}`);
        return result;
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
                    agency: {
                        select: {
                            companyName: true,
                            logo: true,
                            id: true // useful for linking back
                        }
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
        console.log('[TripsService] findOneTemplate called with ID:', id);
        const result = await this.db.tripTemplate.findUnique({
            where: { id },
            include: {
                sessions: true,
                agency: true,
                itinerary: {
                    orderBy: { dayNumber: 'asc' }
                },
            },
        });
        console.log('[TripsService] Result found:', !!result);
        return result;
    }

    async createSession(agencyId: string, templateId: string, dto: CreateTripSessionDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId }
        });
        if (!agency) {
            throw new ForbiddenException('Agency profile not found');
        }

        const template = await this.db.tripTemplate.findFirst({
            where: {
                id: templateId,
                agencyId: agencyId,
            },
        });

        if (!template) {
            throw new ForbiddenException('Trip template not found or access denied');
        }

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

    async updateTemplate(id: string, agencyId: string, dto: Partial<CreateTripTemplateDto>) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency) throw new ForbiddenException('Agency profile not found');

        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Updating template ${id} for agency ${agencyId}`);

        // Verify ownership
        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing) throw new NotFoundException('Trip template not found');

        return this.db.tripTemplate.update({
            where: { id },
            data: {
                ...tripData,
                itinerary: itinerary ? {
                    deleteMany: {},
                    create: itinerary
                } : undefined
            },
            include: {
                itinerary: true
            }
        });
    }

    async deleteTemplate(id: string, agencyId: string) {
        const agency = await this.db.agencyProfile.findUnique({ where: { id: agencyId } });
        if (!agency) throw new ForbiddenException('Agency profile not found');

        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agencyId }
        });
        if (!existing) throw new NotFoundException('Trip template not found');

        return this.db.tripTemplate.delete({
            where: { id },
        });
    }
}
