import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@ouiboo/database';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add trip to wishlist
   */
  async addToWishlist(userId: string, tripId: string) {
    // Verify trip exists
    const trip = await this.prisma.tripTemplate.findUnique({
      where: { id: tripId },
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
    const skip = (page - 1) * limit;

    const [wishlists, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where: { userId },
        include: {
          tripTemplate: {
            include: {
              agency: { select: { id: true, companyName: true, logo: true } },
              sessions: {
                where: {
                  status: 'OPEN',
                },
                select: { id: true, startDate: true, endDate: true, price: true },
                orderBy: { startDate: 'asc' },
                take: 3,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wishlist.count({
        where: { userId },
      }),
    ]);

    return {
      wishlists,
      total,
      page,
      pages: Math.ceil(total / limit),
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
