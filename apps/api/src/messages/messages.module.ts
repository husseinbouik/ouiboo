import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { AdminMessagesController } from './admin-messages.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  // UploadModule: attachment validation and storage-object deletion
  // for moderation (#251/B23) go through UploadService.
  imports: [DatabaseModule, UploadModule],
  providers: [MessagesService],
  controllers: [MessagesController, AdminMessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
