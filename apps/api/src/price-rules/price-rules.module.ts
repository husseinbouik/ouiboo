import { Module } from '@nestjs/common';
import { PriceRulesController } from './price-rules.controller';
import { PriceRulesService } from './price-rules.service';

@Module({
    controllers: [PriceRulesController],
    providers: [PriceRulesService],
})
export class PriceRulesModule { }
