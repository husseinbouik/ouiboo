import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { PriceRulesService } from './price-rules.service';

/** #755: agency price-rule CRUD — tenant scope + audit trail. */
function makeDb() {
  const audits: any[] = [];
  const db: any = {
    _audits: audits,
    tripTemplate: { findFirst: jest.fn(async () => ({ id: 'template-1' })) },
    tripSession: { findFirst: jest.fn(async () => ({ id: 'session-1' })) },
    sessionPriceRule: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: 'rule-1', createdAt: new Date(), updatedAt: new Date(), usedCount: 0, discountGranted: new Prisma.Decimal('0'), isActive: true, ...data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    auditLog: { create: jest.fn(async ({ data }: any) => { audits.push(data); return data; }) },
  };
  return db;
}

const baseDto: any = {
  name: 'Low season',
  templateId: 'template-1',
  discountType: 'PERCENT',
  discountValue: 15,
};

describe('PriceRulesService (#755)', () => {
  it('creates a template-scoped rule for the caller agency and audits it', async () => {
    const db = makeDb();
    const out: any = await new PriceRulesService(db).create('agency-1', 'agency-user-1', baseDto);
    expect(out.id).toBe('rule-1');
    expect(out.discountValue).toBe('15.00');
    expect(db._audits[0]).toMatchObject({ action: 'PRICE_RULE_CREATED', targetType: 'SessionPriceRule', targetId: 'rule-1' });
    expect(db._audits[0].metadata.agencyId).toBe('agency-1');
  });

  it('refuses a rule targeting another agency\u2019s trip', async () => {
    const db = makeDb();
    db.tripTemplate.findFirst.mockResolvedValue(null);
    await expect(new PriceRulesService(db).create('agency-1', 'agency-user-1', baseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires exactly one scope target', async () => {
    const db = makeDb();
    await expect(new PriceRulesService(db).create('agency-1', 'u', { ...baseDto, templateId: undefined })).rejects.toBeInstanceOf(BadRequestException);
    await expect(new PriceRulesService(db).create('agency-1', 'u', { ...baseDto, sessionId: 'session-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a percent over 100 and an inverted window', async () => {
    const db = makeDb();
    await expect(new PriceRulesService(db).create('agency-1', 'u', { ...baseDto, discountValue: 150 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(new PriceRulesService(db).create('agency-1', 'u', { ...baseDto, startsAt: '2026-12-02T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivation is tenant-scoped, audited, and 404s for another agency\u2019s rule', async () => {
    const db = makeDb();
    db.sessionPriceRule.findFirst.mockResolvedValue({
      id: 'rule-1', agencyId: 'agency-1', templateId: 'template-1', sessionId: null, name: 'Low season',
      discountType: 'PERCENT', discountValue: new Prisma.Decimal('15'), startsAt: null, endsAt: null,
      maxUses: null, usedCount: 0, budgetCap: null, discountGranted: new Prisma.Decimal('0'),
      stacksWithPromoCode: false, isActive: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const out: any = await new PriceRulesService(db).setActive('agency-1', 'agency-user-1', 'rule-1', false);
    expect(out.isActive).toBe(false);
    expect(db._audits[0].action).toBe('PRICE_RULE_DEACTIVATED');

    const db2 = makeDb();
    db2.sessionPriceRule.updateMany.mockResolvedValue({ count: 0 });
    await expect(new PriceRulesService(db2).setActive('agency-2', 'u2', 'rule-1', false)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only the caller agency\u2019s rules', async () => {
    const db = makeDb();
    await new PriceRulesService(db).list('agency-1');
    expect(db.sessionPriceRule.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { agencyId: 'agency-1' } }));
  });
});
