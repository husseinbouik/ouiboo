import { Prisma } from '@ouiboo/database';
import { resolvePriceRuleDiscount, selectPriceRule, type SessionPriceRuleForBooking } from './price-rules.util';

/** #755: campaign/session pricing — pure selection + pricing rules. */
function rule(over: Partial<SessionPriceRuleForBooking> = {}): SessionPriceRuleForBooking {
  return {
    id: 'rule-1',
    agencyId: 'agency-1',
    templateId: 'template-1',
    sessionId: null,
    name: 'Low season',
    discountType: 'PERCENT',
    discountValue: new Prisma.Decimal('10'),
    startsAt: null,
    endsAt: null,
    maxUses: null,
    usedCount: 0,
    budgetCap: null,
    discountGranted: new Prisma.Decimal('0'),
    stacksWithPromoCode: false,
    isActive: true,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    ...over,
  };
}

const ctx = { agencyId: 'agency-1', templateId: 'template-1', sessionId: 'session-1', now: new Date('2026-11-10T00:00:00Z') };

describe('selectPriceRule (#755)', () => {
  it('selects an in-window active template rule for its own agency', () => {
    expect(selectPriceRule([rule()], ctx)?.id).toBe('rule-1');
  });

  it('prefers a session-scoped rule over a template-scoped one', () => {
    const templateRule = rule({ id: 'rule-template', createdAt: new Date('2026-10-01T00:00:00Z') });
    const sessionRule = rule({ id: 'rule-session', sessionId: 'session-1', templateId: null, createdAt: new Date('2026-11-02T00:00:00Z') });
    expect(selectPriceRule([templateRule, sessionRule], ctx)?.id).toBe('rule-session');
  });

  it('skips rules of another agency, another trip, or another session', () => {
    expect(selectPriceRule([rule({ agencyId: 'agency-2' })], ctx)).toBeNull();
    expect(selectPriceRule([rule({ templateId: 'template-9' })], ctx)).toBeNull();
    expect(selectPriceRule([rule({ sessionId: 'session-9', templateId: null })], ctx)).toBeNull();
  });

  it('skips inactive, out-of-window and exhausted rules', () => {
    expect(selectPriceRule([rule({ isActive: false })], ctx)).toBeNull();
    expect(selectPriceRule([rule({ startsAt: new Date('2026-12-01T00:00:00Z') })], ctx)).toBeNull();
    expect(selectPriceRule([rule({ endsAt: new Date('2026-11-01T00:00:00Z') })], ctx)).toBeNull();
    expect(selectPriceRule([rule({ maxUses: 3, usedCount: 3 })], ctx)).toBeNull();
  });

  it('breaks ties deterministically by earliest creation', () => {
    const later = rule({ id: 'rule-b', createdAt: new Date('2026-11-03T00:00:00Z') });
    const earlier = rule({ id: 'rule-a', createdAt: new Date('2026-11-02T00:00:00Z') });
    expect(selectPriceRule([later, earlier], ctx)?.id).toBe('rule-a');
  });
});

describe('resolvePriceRuleDiscount (#755)', () => {
  it('prices percent and fixed discounts on the authoritative total and reconciles', () => {
    const percent = resolvePriceRuleDiscount({ rule: rule(), baseTotal: new Prisma.Decimal('500'), currency: 'MAD' });
    expect(percent?.discountAmount.toFixed(2)).toBe('50.00');
    expect(percent?.totalAmount.toFixed(2)).toBe('450.00');
    expect(percent?.snapshot).toEqual(expect.objectContaining({ baseTotal: '500.00', discountAmount: '50.00', totalAmount: '450.00', currency: 'MAD' }));

    const fixed = resolvePriceRuleDiscount({
      rule: rule({ discountType: 'FIXED_MAD', discountValue: new Prisma.Decimal('700') }),
      baseTotal: new Prisma.Decimal('500'),
      currency: 'MAD',
    });
    expect(fixed?.discountAmount.toFixed(2)).toBe('500.00');
    expect(fixed?.totalAmount.toFixed(2)).toBe('0.00');
  });

  it('caps the grant at the remaining budget and ends the campaign when it is spent', () => {
    const capped = resolvePriceRuleDiscount({
      rule: rule({ budgetCap: new Prisma.Decimal('120'), discountGranted: new Prisma.Decimal('100') }),
      baseTotal: new Prisma.Decimal('500'),
      currency: 'MAD',
    });
    // 10% of 500 = 50, but only 20 of budget remains.
    expect(capped?.discountAmount.toFixed(2)).toBe('20.00');
    expect(capped?.budgetClaimCeiling?.toFixed(2)).toBe('100.00');

    const spent = resolvePriceRuleDiscount({
      rule: rule({ budgetCap: new Prisma.Decimal('100'), discountGranted: new Prisma.Decimal('100') }),
      baseTotal: new Prisma.Decimal('500'),
      currency: 'MAD',
    });
    expect(spent).toBeNull();
  });
});
