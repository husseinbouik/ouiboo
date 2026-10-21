import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCopyrightReportDto, ResolveCopyrightReportDto } from './dto/copyright.dto';

@Injectable()
export class CopyrightService {
    constructor(private db: DatabaseService) { }

    async createReport(dto: CreateCopyrightReportDto) {
        if (dto.rightsAttestation !== true) {
            throw new BadRequestException(
                'A rights attestation is required to file a copyright report',
            );
        }
        const report = await this.db.copyrightReport.create({
            data: {
                reporterName: dto.reporterName.trim(),
                reporterEmail: dto.reporterEmail.trim().toLowerCase(),
                contentUrl: dto.contentUrl.trim(),
                description: dto.description.trim(),
            },
        });
        return { id: report.id, status: report.status, createdAt: report.createdAt };
    }

    async listReports(status?: string) {
        const normalized = status?.trim().toUpperCase();
        return this.db.copyrightReport.findMany({
            where: normalized ? { status: normalized as never } : undefined,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 200,
        });
    }

    async resolveReport(id: string, dto: ResolveCopyrightReportDto, adminId: string) {
        const report = await this.db.copyrightReport.findUnique({ where: { id } });
        if (!report) {
            throw new NotFoundException('Copyright report not found');
        }
        if (dto.status === 'ACTIONED' && dto.tripId) {
            await this.db.tripTemplate.update({
                where: { id: dto.tripId },
                data: { status: 'INACTIVE' as never },
            });
        }
        return this.db.copyrightReport.update({
            where: { id },
            data: {
                status: dto.status as never,
                resolvedAt: new Date(),
                resolvedBy: adminId,
            },
        });
    }
}
