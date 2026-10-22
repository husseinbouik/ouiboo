import { Module } from '@nestjs/common';
import { CopyrightController } from './copyright.controller';
import { AdminCopyrightController } from './admin-copyright.controller';
import { CopyrightService } from './copyright.service';

@Module({
    controllers: [CopyrightController, AdminCopyrightController],
    providers: [CopyrightService],
})
export class CopyrightModule { }
