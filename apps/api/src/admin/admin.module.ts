import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSeedService } from './admin-seed.service';
import { DatabaseModule } from '../database/database.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
    imports: [DatabaseModule, WalletsModule],
    controllers: [AdminController],
    providers: [AdminSeedService],
})
export class AdminModule { }
