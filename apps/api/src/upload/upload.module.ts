import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { MediaController } from './media.controller';
import { CommonModule } from '../common/common.module';
import { UploadSafetyService } from './upload-safety.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [CommonModule, AuthModule],
    controllers: [UploadController, MediaController],
    providers: [UploadService, UploadSafetyService],
    exports: [UploadService, UploadSafetyService],
})
export class UploadModule { }
