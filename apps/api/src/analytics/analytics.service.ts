import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
    const sessions = await this.prisma.tripSession.count({
      where: {
        template: { agencyId },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const bookings = await this.prisma.booking.count({
      where: {
        session: {
          template: { agencyId },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const confirmed = await this.prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        session: {
          template: { agencyId },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const completed = await this.prisma.booking.count({
      where: {
        status: 'COMPLETED',
        session: {
          template: { agencyId },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

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
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: {
        reviews: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return trips.map((trip) => {
      const totalBookings = trip.sessions.reduce(
        (acc, session) => acc + session.bookings.length,
        0,
      );
      const totalRevenue = trip.sessions.reduce(
        (acc, session) =>
          acc +
          session.bookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
        0,
      );
      const avgRating =
        trip.reviews.length > 0
          ? trip.reviews.reduce((sum, r) => sum + r.rating, 0) /
            trip.reviews.length
          : 0;

      return {
        id: trip.id,
        title: trip.title,
        bookings: totalBookings,
        revenue: totalRevenue,
        avgRating,
        reviewCount: trip.reviews.length,
      };
    });
  }

  /**
   * Get payment method distribution
   */
  async getPaymentMethodDistribution(agencyId: string) {
    const payments = await this.prisma.booking.findMany({
      where: {
        session: {
          template: { agencyId },
        },
      },
      select: { paymentMethod: true },
    });

    const distribution = {
      MANUAL: 0,
      GATEWAY: 0,
    };

    payments.forEach((payment) => {
      distribution[payment.paymentMethod]++;
    });

    return distribution;
  }

  /**
   * Get customer demographics
   */
  async getCustomerDemographics(agencyId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        session: {
          template: { agencyId },
        },
      },
      include: {
        traveler: true,
      },
      distinct: ['travelerId'],
    });

    const repeatCustomers = await this.prisma.booking.groupBy({
      by: ['travelerId'],
      where: {
        session: {
          template: { agencyId },
        },
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    return {
      totalCustomers: bookings.length,
      repeatCustomers: repeatCustomers.length,
      repeatCustomerRate:
        bookings.length > 0
          ? (repeatCustomers.length / bookings.length) * 100
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
      gmv: totalRevenue._sum.totalAmount || 0,
      totalBookings,
      totalAgencies,
      totalTravelers,
      avgBookingValue: Math.round(avgBookingValue._avg.totalAmount || 0),
    };
  }

  /**
   * Group bookings by time period
   */
  private groupByPeriod(
    bookings: Array<{ totalAmount: number; createdAt: Date }>,
    period: 'daily' | 'weekly' | 'monthly',
  ) {
    const grouped: Record<string, number> = {};

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

      grouped[key] = (grouped[key] || 0) + booking.totalAmount;
    });

    return Object.entries(grouped).map(([date, amount]) => ({
      date,
      amount,
    }));
  }
}
