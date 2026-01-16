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

        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Creating template. Itinerary count: ${itinerary?.length || 0}`);
        if (itinerary) {
            console.log(`[TripsService] Itinerary data:`, JSON.stringify(itinerary, null, 2));
        }

        const data = {
            ...tripData,
            agencyId: agency.id,
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

        console.log(`[TripsService] Created template ${result.id} for agency ${agency.id}.Status: DRAFT`);
        return result;
    }

    async findAllTemplates(featured?: boolean, status?: string, agencyId?: string) {
        try {
            const where: any = {};
            if (featured) where.featured = true;
            if (status) where.status = status;
            if (agencyId) where.agencyId = agencyId;

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

    async createSession(userId: string, templateId: string, dto: CreateTripSessionDto) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { userId }
        });
        if (!agency) {
            throw new Error('Agency profile not found');
        }

        const template = await this.db.tripTemplate.findFirst({
            where: {
                id: templateId,
                agencyId: agency.id,
            },
        });

        if (!template) {
            throw new Error('Trip template not found or unauthorized');
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

    async updateTemplate(id: string, userId: string, dto: Partial<CreateTripTemplateDto>) {
        const agency = await this.db.agencyProfile.findUnique({ where: { userId } });
        if (!agency) throw new Error('Agency profile not found');

        const { itinerary, ...tripData } = dto;
        console.log(`[TripsService] Updating template ${id} for agency ${agency.id}`);

        // Verify ownership
        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agency.id }
        });
        if (!existing) throw new Error('Trip template not found or unauthorized');

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

    async deleteTemplate(id: string, userId: string) {
        const agency = await this.db.agencyProfile.findUnique({ where: { userId } });
        if (!agency) throw new Error('Agency profile not found');

        // Verify ownership implicitly by deleting with agencyId in where (Prisma doesn't support easy delete with composite where unless ID is unique, but we can findFirst then delete)
        // Actually, deleteMany is safer here to avoid errors if not found, but we want to error if not found.

        const existing = await this.db.tripTemplate.findFirst({
            where: { id, agencyId: agency.id }
        });
        if (!existing) throw new Error('Trip template not found or unauthorized');

        return this.db.tripTemplate.delete({
            where: { id },
        });
    }
}
