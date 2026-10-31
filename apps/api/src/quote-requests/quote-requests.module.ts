import { Module } from '@nestjs/common';
import { QuoteRequestsController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';

@Module({
    controllers: [QuoteRequestsController],
    providers: [QuoteRequestsService],
})
export class QuoteRequestsModule { }
