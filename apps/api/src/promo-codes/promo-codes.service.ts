import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PromoDiscountType } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { toMoneyDecimal } from '../common/money.util';
import { CreatePromoCodeDto } from './dto/promo-code.dto';
import { normalizePromoCode, serializePromoCode } from './promo-codes.util';

/**
 * #778 (Council S6 Phase 3): agency-funded promo codes — agency CRUD.
 *
 * Tenant scope is the caller's agency (req.tenantId, resolved by
 * TenantGuard from the caller's own profile); every query is filtered
 * by it, so an agency can never read or mutate another agency's codes.
 * The agency funds 100% of every discount its codes grant.
 */
@Injectable()
export class PromoCodesService {
    constructor(private db: DatabaseService) { }

    async list(agencyId: string) {
        const rows = await this.db.promoCode.findMany({
            where: { agencyId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 200,
        });
        return rows.map(serializePromoCode);
    }

    async create(agencyId: string, dto: CreatePromoCodeDto) {
        const code = normalizePromoCode(dto.code);
        if (!code) {
            throw new BadRequestException('A promo code is required');
        }
        const value = toMoneyDecimal(dto.discountValue, 'discountValue');
        if (dto.discountType === PromoDiscountType.PERCENT && value.greaterThan(100)) {
            throw new BadRequestException('A percent discount cannot exceed 100');
        }
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
        const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
        if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
            throw new BadRequestException('The validity window end must be after its start');
        }
        const existing = await this.db.promoCode.findFirst({
            where: { agencyId, code },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException('This code already exists for your agency');
        }
        try {
            const row = await this.db.promoCode.create({
                data: {
                    agencyId,
                    code,
                    discountType: dto.discountType,
                    discountValue: value,
                    startsAt,
                    endsAt,
                    maxUses: dto.maxUses ?? null,
                },
            });
            return serializePromoCode(row);
        } catch (error) {
            // Concurrent creates of the same code: the unique index is
            // the arbiter; answer the same conflict as the pre-check.
            if ((error as { code?: unknown })?.code === 'P2002') {
                throw new ConflictException('This code already exists for your agency');
            }
            throw error;
        }
    }

    async setActive(agencyId: string, id: string, isActive: boolean) {
        const result = await this.db.promoCode.updateMany({
            where: { id, agencyId },
            data: { isActive },
        });
        if (result.count === 0) {
            throw new NotFoundException('Promo code not found');
        }
        const row = await this.db.promoCode.findFirst({ where: { id, agencyId } });
        return serializePromoCode(row as never);
    }
}
