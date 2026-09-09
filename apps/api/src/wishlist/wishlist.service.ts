import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Add trip to wishlist
   */
  async addToWishlist(userId: string, tripId: string) {
    const trip = await this.prisma.tripTemplate.findFirst({
      where: { id: tripId, status: 'ACTIVE' },
    });

    if (!trip) {
      throw new BadRequestException('Trip not found');
    }

    try {
      const wishlist = await this.prisma.wishlist.create({
        data: {
          userId,
          tripTemplateId: tripId,
        },
        include: { tripTemplate: true },
      });

      return wishlist;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Trip already in wishlist');
      }
      throw error;
    }
  }

  /**
   * Remove trip from wishlist
   */
  async removeFromWishlist(userId: string, tripId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: {
        userId_tripTemplateId: {
          userId,
          tripTemplateId: tripId,
        },
      },
    });

    if (!wishlist) {
      throw new BadRequestException('Trip not in wishlist');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_tripTemplateId: {
          userId,
          tripTemplateId: tripId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get user's wishlist
   */
  async getUserWishlist(userId: string, page: number = 1, limit: number = 20) {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(50, Math.max(1, Math.floor(limit))) : 20;
    const skip = (safePage - 1) * safeLimit;
    const where = { userId, tripTemplate: { status: 'ACTIVE' as const } };

    const [wishlists, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        include: {
          tripTemplate: {
            include: {
              agency: { select: { id: true, companyName: true, logo: true } },
              sessions: {
                where: {
                  status: 'OPEN',
                  startDate: { gte: new Date() },
                },
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  price: true,
                  availableSeats: true,
                  status: true,
                  currency: true,
                },
                orderBy: { startDate: 'asc' },
                take: 3,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.wishlist.count({
        where,
      }),
    ]);

    return {
      items: wishlists.map((wishlist) => wishlist.tripTemplate),
      total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Check if trip is in wishlist
   */
  async isInWishlist(userId: string, tripId: string): Promise<boolean> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: {
        userId_tripTemplateId: {
          userId,
          tripTemplateId: tripId,
        },
      },
    });

    return !!wishlist;
  }

  /**
   * Get wishlist count
   */
  async getWishlistCount(userId: string): Promise<number> {
    return this.prisma.wishlist.count({
      where: { userId },
    });
  }

  /**
   * Get trips with most wishlist adds (popularity metric)
   */
  async getMostWishlistedTrips(limit: number = 10) {
    const wishlists = await this.prisma.wishlist.groupBy({
      by: ['tripTemplateId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    const tripIds = wishlists.map((w) => w.tripTemplateId);

    const trips = await this.prisma.tripTemplate.findMany({
      where: {
        id: {
          in: tripIds,
        },
      },
      include: {
        agency: { select: { id: true, companyName: true, logo: true } },
      },
    });

    return trips;
  }
}
