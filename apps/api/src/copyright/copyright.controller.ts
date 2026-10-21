import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CopyrightService } from './copyright.service';
import { CreateCopyrightReportDto } from './dto/copyright.dto';

@ApiTags('copyright')
@Controller('copyright')
export class CopyrightController {
    constructor(private copyrightService: CopyrightService) { }

    @Post('reports')
    @HttpCode(201)
    @ApiOperation({ summary: 'File a copyright takedown report (public)' })
    create(@Body() dto: CreateCopyrightReportDto) {
        return this.copyrightService.createReport(dto);
    }
}
