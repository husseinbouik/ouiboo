import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
import { RetentionService } from './retention.service';

/**
 * #438: retention enforcement (adopted schedule, see
 * retention-config.ts). Exposed to schedulers through the cron
 * controller (POST /cron/retention); DatabaseService is global.
 */
@Module({
    imports: [UploadModule],
    providers: [RetentionService],
    exports: [RetentionService],
})
export class RetentionModule {}
