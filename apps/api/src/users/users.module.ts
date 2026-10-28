import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
    // UploadModule: account deletion (#251/B23) deletes the user's stored
    // files from object storage via UploadService.
    imports: [UploadModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
