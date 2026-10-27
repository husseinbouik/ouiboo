import { AnalyticsService } from './analytics.service';

/**
 * #432: definition fixes — the funnel must not call TripSession rows
 * "views", and platform metrics must not present agency takings as
 * platform revenue.
 */
describe('AnalyticsService definitions (#432)', () => {
  it('conversion funnel counts sessions created, not views', async () => {
    const prisma: any = {
      tripSession: { count: jest.fn(async () => 12) },
      booking: {
        count: jest.fn(async ({ where }: any) => {
          if (where.status === 'CONFIRMED') return 6;
          if (where.status === 'COMPLETED') return 4;
          return 10;
        }),
      },
    };
    const service = new AnalyticsService(prisma);
    const funnel = await service.getConversionFunnel(
      'agency-1',
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-27T00:00:00Z'),
    );
    expect(funnel).toEqual({
      sessionsCreated: 12,
      bookingAttempts: 10,
      confirmed: 6,
      completed: 4,
      completionRate: 40,
    });
    expect(funnel).not.toHaveProperty('views');
    expect(funnel).not.toHaveProperty('conversionRate');
  });

  it('platform metrics report gross booking value and zero platform revenue', async () => {
    const prisma: any = {
      booking: {
        aggregate: jest.fn(async (args: any) => {
          if (args._sum) return { _sum: { totalAmount: '1500.00' } };
          return { _avg: { totalAmount: '250.00' } };
        }),
        count: jest.fn(async () => 20),
      },
      agencyProfile: { count: jest.fn(async () => 3) },
      user: { count: jest.fn(async () => 42) },
    };
    const service = new AnalyticsService(prisma);
    const metrics = await service.getPlatformMetrics();
    expect(metrics.grossBookingValue).toBe('1500.00');
    // No fee capture exists before the monetisation gate (#426):
    // platform revenue is honestly 0, never the agencies' takings.
    expect(metrics.platformRevenue).toBe('0.00');
    expect(metrics).not.toHaveProperty('gmv');
    expect(metrics.totalBookings).toBe(20);
    expect(metrics.avgBookingValue).toBe('250.00');
  });
});
