import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PromoDiscountType } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { toMoneyDecimal } from '../common/money.util';
import { CreateSessionPriceRuleDto } from './dto/price-rule.dto';
import { serializeSessionPriceRule } from './price-rules.util';

/**
 * #755: campaign/session pricing — agency CRUD for SessionPriceRule.
 *
 * Tenant scope is the caller's agency (req.tenantId via TenantGuard);
 * scope targets (template/session) are validated against the SAME
 * agency, so a rule can never point at another agency's trip or
 * session. Creation and deactivation write AuditLog rows — campaign
 * definitions are auditable, and every application is snapshotted
 * onto its booking.
 */
@Injectable()
export class PriceRulesService {
    constructor(private db: DatabaseService) { }

    async list(agencyId: string) {
        const rows = await this.db.sessionPriceRule.findMany({
            where: { agencyId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 200,
        });
        return rows.map((row: never) => serializeSessionPriceRule(row));
    }

    async create(agencyId: string, actorUserId: string, dto: CreateSessionPriceRuleDto) {
        if (!dto.templateId && !dto.sessionId) {
            throw new BadRequestException('A price rule must target a trip (templateId) or a session (sessionId)');
        }
        if (dto.templateId && dto.sessionId) {
            throw new BadRequestException('A price rule targets either a trip or a session, not both');
        }
        const value = toMoneyDecimal(dto.discountValue, 'discountValue');
        if (dto.discountType === PromoDiscountType.PERCENT && value.greaterThan(100)) {
            throw new BadRequestException('A percent discount cannot exceed 100');
        }
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
        const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
        if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
            throw new BadRequestException('The eligibility window end must be after its start');
        }
        // Scope targets must belong to the caller's own agency.
        if (dto.templateId) {
            const template = await this.db.tripTemplate.findFirst({
                where: { id: dto.templateId, agencyId },
                select: { id: true },
            });
            if (!template) {
                throw new BadRequestException('The targeted trip does not belong to your agency');
            }
        }
        if (dto.sessionId) {
            const session = await this.db.tripSession.findFirst({
                where: { id: dto.sessionId, agencyId },
                select: { id: true },
            });
            if (!session) {
                throw new BadRequestException('The targeted session does not belong to your agency');
            }
        }
        const row = await this.db.sessionPriceRule.create({
            data: {
                agencyId,
                templateId: dto.templateId ?? null,
                sessionId: dto.sessionId ?? null,
                name: dto.name.trim(),
                discountType: dto.discountType,
                discountValue: value,
                startsAt,
                endsAt,
                maxUses: dto.maxUses ?? null,
                budgetCap: dto.budgetCap != null ? toMoneyDecimal(dto.budgetCap, 'budgetCap') : null,
                stacksWithPromoCode: dto.stacksWithPromoCode ?? false,
            },
        });
        await this.db.auditLog
            .create({
                data: {
                    actorId: actorUserId ?? null,
                    action: 'PRICE_RULE_CREATED',
                    targetType: 'SessionPriceRule',
                    targetId: row.id,
                    metadata: { agencyId, name: row.name, scope: row.sessionId ? 'SESSION' : 'TEMPLATE' },
                },
            })
            .catch((err: unknown) => console.error('Audit log failed', err));
        return serializeSessionPriceRule(row as never);
    }

    async setActive(agencyId: string, actorUserId: string, id: string, isActive: boolean) {
        const result = await this.db.sessionPriceRule.updateMany({
            where: { id, agencyId },
            data: { isActive },
        });
        if (result.count === 0) {
            throw new NotFoundException('Price rule not found');
        }
        await this.db.auditLog
            .create({
                data: {
                    actorId: actorUserId ?? null,
                    action: isActive ? 'PRICE_RULE_ACTIVATED' : 'PRICE_RULE_DEACTIVATED',
                    targetType: 'SessionPriceRule',
                    targetId: id,
                    metadata: { agencyId },
                },
            })
            .catch((err: unknown) => console.error('Audit log failed', err));
        const row = await this.db.sessionPriceRule.findFirst({ where: { id, agencyId } });
        return serializeSessionPriceRule(row as never);
    }
}
