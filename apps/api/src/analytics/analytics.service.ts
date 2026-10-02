import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MoneyInput, decimalZero, toMoneyDecimal, toMoneyString } from '../common/money.util';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Get revenue trends for agency
   */
  async getRevenueTrends(
    agencyId: string,
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    this.validateDateRange(startDate, endDate);
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      throw new BadRequestException('Invalid analytics period');
    }
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        session: {
          template: {
            agencyId,
          },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Group by period and sum amounts
    const trends = this.groupByPeriod(bookings, period);

    return trends;
  }

  /**
   * Get booking conversion funnel
   */
  async getConversionFunnel(
    agencyId: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.validateDateRange(startDate, endDate);
    const dateFilter = { gte: startDate, lte: endDate };
    const [sessions, bookings, confirmed, completed] = await Promise.all([
      this.prisma.tripSession.count({
      where: {
        template: { agencyId },
        createdAt: dateFilter,
      },
      }),
      this.prisma.booking.count({
      where: {
        session: {
          template: { agencyId },
        },
        createdAt: dateFilter,
      },
      }),
      this.prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        session: {
          template: { agencyId },
        },
        createdAt: dateFilter,
      },
      }),
      this.prisma.booking.count({
      where: {
        status: 'COMPLETED',
        session: {
          template: { agencyId },
        },
        createdAt: dateFilter,
      },
      }),
    ]);

    return {
      views: sessions,
      bookingAttempts: bookings,
      confirmed,
      completed,
      conversionRate: sessions > 0 ? (completed / sessions) * 100 : 0,
    };
  }

  /**
   * Get top performing trips
   */
  async getTopTrips(agencyId: string, limit: number = 10) {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(50, Math.max(1, Math.floor(limit)))
      : 10;
    const trips = await this.prisma.tripTemplate.findMany({
      where: { agencyId },
      include: {
        sessions: {
          select: {
            bookings: {
              select: {
                totalAmount: true,
              },
            },
          },
        },
        _count: { select: { reviews: true } },
      },
      orderBy: {
        reviews: {
          _count: 'desc',
        },
      },
      take: normalizedLimit,
    });

    return trips.map((trip) => {
      const totalBookings = trip.sessions.reduce(
        (acc, session) => acc + session.bookings.length,
        0,
      );
      const totalRevenue = trip.sessions.reduce(
        (acc, session) =>
          acc.add(session.bookings.reduce((sum, booking) => sum.add(toMoneyDecimal(booking.totalAmount)), decimalZero())),
        decimalZero(),
      );
      return {
        id: trip.id,
        title: trip.title,
        bookings: totalBookings,
        revenue: toMoneyString(totalRevenue) || '0.00',
        avgRating: trip.averageRating,
        reviewCount: trip._count.reviews,
      };
    });
  }

  /**
   * Get payment method distribution
   */
  async getPaymentMethodDistribution(agencyId: string) {
    const payments = await this.prisma.booking.groupBy({
      by: ['paymentMethod'],
      where: {
        session: {
          template: { agencyId },
        },
      },
      _count: { _all: true },
    });

    const distribution = {
      MANUAL: 0,
      GATEWAY: 0,
    };

    payments.forEach((payment) => {
      distribution[payment.paymentMethod] = payment._count._all;
    });

    return distribution;
  }

  /**
   * Get customer demographics
   */
  async getCustomerDemographics(agencyId: string) {
    const customers = await this.prisma.booking.groupBy({
      by: ['travelerId'],
      where: {
        session: {
          template: { agencyId },
        },
      },
      _count: {
        id: true,
      },
    });
    const repeatCustomers = customers.filter((customer) => customer._count.id > 1).length;

    return {
      totalCustomers: customers.length,
      repeatCustomers,
      repeatCustomerRate:
        customers.length > 0
          ? (repeatCustomers / customers.length) * 100
          : 0,
    };
  }

  /**
   * Platform-wide analytics
   */
  async getPlatformMetrics() {
    const [totalRevenue, totalBookings, totalAgencies, totalTravelers, avgBookingValue] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.agencyProfile.count(),
      this.prisma.user.count({
        where: { role: 'TRAVELER' },
      }),
      this.prisma.booking.aggregate({
        where: { status: 'COMPLETED' },
        _avg: { totalAmount: true },
      }),
    ]);

    return {
      gmv: toMoneyString(totalRevenue._sum.totalAmount) || '0.00',
      totalBookings,
      totalAgencies,
      totalTravelers,
      avgBookingValue: toMoneyString(avgBookingValue._avg.totalAmount) || '0.00',
    };
  }

  /**
   * Group bookings by time period
   */
  private groupByPeriod(
    bookings: Array<{ totalAmount: MoneyInput; createdAt: Date }>,
    period: 'daily' | 'weekly' | 'monthly',
  ) {
    const grouped: Record<string, ReturnType<typeof decimalZero>> = {};

    bookings.forEach((booking) => {
      let key: string;

      if (period === 'daily') {
        key = booking.createdAt.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const date = new Date(booking.createdAt);
        const weekStart = new Date(
          date.setDate(date.getDate() - date.getDay()),
        );
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = booking.createdAt.toISOString().slice(0, 7); // YYYY-MM
      }

      grouped[key] = (grouped[key] || decimalZero()).add(toMoneyDecimal(booking.totalAmount));
    });

    return Object.entries(grouped).map(([date, amount]) => ({
      date,
      amount: toMoneyString(amount) || '0.00',
    }));
  }

  private validateDateRange(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Valid startDate and endDate are required');
    }
    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }
    const maxRangeMs = 2 * 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
      throw new BadRequestException('Analytics date range cannot exceed two years');
    }
  }
}
