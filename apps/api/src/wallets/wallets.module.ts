import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [WalletsService],
    exports: [WalletsService],
})
export class WalletsModule { }
