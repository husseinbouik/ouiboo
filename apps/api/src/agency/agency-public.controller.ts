import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgencyPublicService } from './agency-public.service';

@ApiTags('Agency Public')
@Controller('agencies')
export class AgencyPublicController {
    constructor(private readonly agencyPublicService: AgencyPublicService) { }

    @Get(':id/public')
    @ApiOperation({ summary: 'Get public agency profile' })
    async getPublicProfile(@Param('id') id: string) {
        return this.agencyPublicService.getPublicProfile(id);
    }
}
