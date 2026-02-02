import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users/wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  /**
   * Add trip to wishlist
   */
  @Post(':tripId')
  @HttpCode(HttpStatus.CREATED)
  async addToWishlist(
    @Param('tripId') tripId: string,
    @Request() req: any,
  ) {
    return this.wishlistService.addToWishlist(req.user.id, tripId);
  }

  /**
   * Remove trip from wishlist
   */
  @Delete(':tripId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromWishlist(
    @Param('tripId') tripId: string,
    @Request() req: any,
  ) {
    return this.wishlistService.removeFromWishlist(req.user.id, tripId);
  }

  /**
   * Get user's wishlist
   */
  @Get()
  async getWishlist(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req: any,
  ) {
    return this.wishlistService.getUserWishlist(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Check if trip is in wishlist
   */
  @Get(':tripId/is-wishlisted')
  async isInWishlist(
    @Param('tripId') tripId: string,
    @Request() req: any,
  ) {
    const isWishlisted = await this.wishlistService.isInWishlist(
      req.user.id,
      tripId,
    );
    return { isWishlisted };
  }

  /**
   * Get wishlist count
   */
  @Get('count')
  async getCount(@Request() req: any) {
    const count = await this.wishlistService.getWishlistCount(req.user.id);
    return { count };
  }
}
