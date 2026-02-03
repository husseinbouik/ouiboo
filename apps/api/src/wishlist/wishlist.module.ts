import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';

@Module({
  imports: [DatabaseModule],
  providers: [WishlistService],
  controllers: [WishlistController],
  exports: [WishlistService],
})
export class WishlistModule {}
