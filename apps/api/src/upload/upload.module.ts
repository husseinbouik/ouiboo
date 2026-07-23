import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CommonModule } from '../common/common.module';
import { UploadSafetyService } from './upload-safety.service';

@Module({
    imports: [CommonModule],
    controllers: [UploadController],
    providers: [UploadService, UploadSafetyService],
    exports: [UploadService, UploadSafetyService],
})
export class UploadModule { }
