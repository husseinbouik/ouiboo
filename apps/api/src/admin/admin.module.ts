import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '../database/database.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
    imports: [DatabaseModule, WalletsModule],
    controllers: [AdminController],
})
export class AdminModule { }
