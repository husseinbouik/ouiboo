import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/support.dto';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  @HttpCode(201)
  @ApiOperation({ summary: 'Open a help-centre support ticket (public, #446)' })
  create(@Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicket(dto);
  }
}
