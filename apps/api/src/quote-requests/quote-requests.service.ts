import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { buildCancellationScaleSnapshot, parseCancellationScale } from '../cancellation/cancellation.util';
import { toMoneyString } from '../common/money.util';
import { CreateQuoteRequestDto, QuoteReplyDto } from './dto/quote-request.dto';

/**
 * #682 (Council S6): the catalogue firm-quote. For a PUBLISHED trip the
 * traveller submits dates/party; the agency replies with a firm total
 * price in MAD TTC plus its cancellation scale; the traveller accepts
 * and the quote + scale + acceptance timestamp are snapshotted onto
 * the request, immutably (every mutating path refuses an ACCEPTED
 * request). Payments stay DISABLED in beta — an accepted quote is a
 * booking intent and leads to NO payment step. One agency only (the
 * trip's own), no custom itineraries, and no indicative prices: a
 * request carries no amount until the agency's firm quote.
 */
@Injectable()
export class QuoteRequestsService {
    constructor(private db: DatabaseService) { }

    private mapQuoteRequest(row: any) {
        return {
            id: row.id,
            templateId: row.templateId,
            agencyId: row.agencyId,
            travelerId: row.travelerId,
            requestedStartDate: new Date(row.requestedStartDate).toISOString(),
            requestedEndDate: new Date(row.requestedEndDate).toISOString(),
            guestsCount: row.guestsCount,
            note: row.note ?? null,
            status: row.status,
            quotedTotalAmount: toMoneyString(row.quotedTotalAmount) ?? null,
            quotedCurrency: row.quotedCurrency || 'MAD',
            quoteNote: row.quoteNote ?? null,
            cancellationScale: row.cancellationScale ?? null,
            quotedAt: row.quotedAt ? new Date(row.quotedAt).toISOString() : null,
            acceptedAt: row.acceptedAt ? new Date(row.acceptedAt).toISOString() : null,
            acceptedSnapshot: row.acceptedSnapshot ?? null,
            createdAt: new Date(row.createdAt).toISOString(),
            updatedAt: new Date(row.updatedAt).toISOString(),
            template: row.template
                ? {
                    id: row.template.id,
                    title: row.template.title,
                    startLocation: row.template.startLocation,
                    agency: row.template.agency
                        ? { id: row.template.agency.id, companyName: row.template.agency.companyName }
                        : null,
                }
                : null,
            traveler: row.traveler
                ? { email: row.traveler.email, name: row.traveler.name ?? null }
                : null,
        };
    }

    async create(travelerId: string, dto: CreateQuoteRequestDto) {
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
            throw new BadRequestException('The requested end date must be on or after the start date');
        }
        const template = await this.db.tripTemplate.findUnique({
            where: { id: dto.templateId },
            select: { id: true, agencyId: true, status: true },
        });
        if (!template) {
            throw new NotFoundException('Trip not found');
        }
        if (template.status !== 'ACTIVE') {
            throw new BadRequestException('Quotes can only be requested on a published trip');
        }
        const row = await this.db.quoteRequest.create({
            data: {
                templateId: template.id,
                agencyId: template.agencyId,
                travelerId,
                requestedStartDate: start,
                requestedEndDate: end,
                guestsCount: dto.guestsCount,
                note: dto.note?.trim() || null,
            },
            include: {
                template: {
                    select: {
                        id: true, title: true, startLocation: true,
                        agency: { select: { id: true, companyName: true } },
                    },
                },
            },
        });
        return this.mapQuoteRequest(row);
    }

    async listMine(travelerId: string) {
        const rows = await this.db.quoteRequest.findMany({
            where: { travelerId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                template: {
                    select: {
                        id: true, title: true, startLocation: true,
                        agency: { select: { id: true, companyName: true } },
                    },
                },
            },
        });
        return rows.map((row) => this.mapQuoteRequest(row));
    }

    private async resolveAgencyId(userId: string): Promise<string> {
        const profile = await this.db.agencyProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!profile) {
            throw new ForbiddenException('Agency profile not found');
        }
        return profile.id;
    }

    async listForAgency(userId: string) {
        const agencyId = await this.resolveAgencyId(userId);
        const rows = await this.db.quoteRequest.findMany({
            where: { agencyId },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                template: { select: { id: true, title: true, startLocation: true } },
                traveler: { select: { email: true, name: true } },
            },
        });
        return rows.map((row) => this.mapQuoteRequest(row));
    }

    private async loadOwned(id: string) {
        const row = await this.db.quoteRequest.findUnique({ where: { id } });
        if (!row) {
            throw new NotFoundException('Quote request not found');
        }
        return row;
    }

    private assertNotAccepted(row: { status: string }) {
        if (row.status === 'ACCEPTED') {
            throw new BadRequestException(
                'This quote was already accepted — the accepted quote, its cancellation scale and the acceptance timestamp are final and cannot be changed',
            );
        }
    }

    /** Agency reply: the firm MAD TTC total + cancellation scale (48h SLA per the beta offer). */
    async quote(userId: string, id: string, dto: QuoteReplyDto) {
        const agencyId = await this.resolveAgencyId(userId);
        const row = await this.loadOwned(id);
        if (row.agencyId !== agencyId) {
            throw new ForbiddenException('This quote request belongs to another agency');
        }
        this.assertNotAccepted(row);
        if (row.status !== 'PENDING') {
            throw new BadRequestException('This quote request has already been answered');
        }
        const amount = Number(dto.totalAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException('The firm total must be a positive amount in MAD');
        }
        let scale: unknown;
        if (dto.cancellationBands) {
            const parsed = parseCancellationScale({ bands: dto.cancellationBands });
            if (!parsed) {
                throw new BadRequestException(
                    'The cancellation scale is invalid — provide bands of { minDaysBeforeStart, refundPercent } covering 0 days',
                );
            }
            scale = buildCancellationScaleSnapshot({ bands: dto.cancellationBands });
        } else {
            const template = await this.db.tripTemplate.findUnique({
                where: { id: row.templateId },
                select: { cancellationPolicy: true },
            });
            scale = buildCancellationScaleSnapshot(template?.cancellationPolicy);
        }
        const updated = await this.db.quoteRequest.update({
            where: { id },
            data: {
                status: 'QUOTED',
                quotedTotalAmount: dto.totalAmount,
                quotedCurrency: 'MAD',
                quoteNote: dto.note?.trim() || null,
                cancellationScale: scale as Prisma.InputJsonValue,
                quotedAt: new Date(),
            },
            include: {
                template: { select: { id: true, title: true, startLocation: true } },
                traveler: { select: { email: true, name: true } },
            },
        });
        return this.mapQuoteRequest(updated);
    }

    /** Traveller acceptance: snapshot quote + scale + timestamp, immutably. No payment step follows in beta. */
    async accept(travelerId: string, id: string) {
        const row = await this.loadOwned(id);
        if (row.travelerId !== travelerId) {
            throw new ForbiddenException('This quote request belongs to another traveller');
        }
        this.assertNotAccepted(row);
        if (row.status !== 'QUOTED') {
            throw new BadRequestException('Only a quoted request can be accepted — the agency has not sent a firm quote yet');
        }
        const acceptedAt = new Date();
        const snapshot = {
            quotedTotalAmount: toMoneyString(row.quotedTotalAmount) || '0.00',
            quotedCurrency: row.quotedCurrency || 'MAD',
            cancellationScale: (row.cancellationScale as unknown) ?? null,
            quotedAt: row.quotedAt ? new Date(row.quotedAt).toISOString() : null,
            acceptedAt: acceptedAt.toISOString(),
            templateId: row.templateId,
            agencyId: row.agencyId,
        };
        const updated = await this.db.quoteRequest.update({
            where: { id },
            data: {
                status: 'ACCEPTED',
                acceptedAt,
                acceptedSnapshot: snapshot as Prisma.InputJsonValue,
            },
            include: {
                template: {
                    select: {
                        id: true, title: true, startLocation: true,
                        agency: { select: { id: true, companyName: true } },
                    },
                },
            },
        });
        return this.mapQuoteRequest(updated);
    }

    async decline(userId: string, id: string) {
        const agencyId = await this.resolveAgencyId(userId);
        const row = await this.loadOwned(id);
        if (row.agencyId !== agencyId) {
            throw new ForbiddenException('This quote request belongs to another agency');
        }
        this.assertNotAccepted(row);
        if (row.status !== 'PENDING' && row.status !== 'QUOTED') {
            throw new BadRequestException('This quote request is already closed');
        }
        const updated = await this.db.quoteRequest.update({
            where: { id },
            data: { status: 'DECLINED' },
        });
        return this.mapQuoteRequest(updated);
    }

    async cancel(travelerId: string, id: string) {
        const row = await this.loadOwned(id);
        if (row.travelerId !== travelerId) {
            throw new ForbiddenException('This quote request belongs to another traveller');
        }
        this.assertNotAccepted(row);
        if (row.status !== 'PENDING' && row.status !== 'QUOTED') {
            throw new BadRequestException('This quote request is already closed');
        }
        const updated = await this.db.quoteRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        return this.mapQuoteRequest(updated);
    }
}
