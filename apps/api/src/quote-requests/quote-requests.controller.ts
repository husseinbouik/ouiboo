import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQuoteRequestDto, QuoteReplyDto } from './dto/quote-request.dto';
import { QuoteRequestsService } from './quote-requests.service';

@ApiTags('QuoteRequests')
@Controller('quote-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuoteRequestsController {
    constructor(private readonly quoteRequestsService: QuoteRequestsService) { }

    @Post()
    @ApiOperation({ summary: 'Traveller requests a firm quote for dates/party on a published trip (#682)' })
    create(@Request() req, @Body() dto: CreateQuoteRequestDto) {
        return this.quoteRequestsService.create(req.user.userId, dto);
    }

    @Get('mine')
    @ApiOperation({ summary: 'The traveller\u2019s quote requests, with accepted snapshots' })
    listMine(@Request() req) {
        return this.quoteRequestsService.listMine(req.user.userId);
    }

    @Get('agency')
    @ApiOperation({ summary: 'Quote requests addressed to the signed-in agency' })
    listForAgency(@Request() req) {
        return this.quoteRequestsService.listForAgency(req.user.userId);
    }

    @Patch(':id/quote')
    @ApiOperation({ summary: 'Agency replies with the firm MAD TTC total + cancellation scale' })
    quote(@Request() req, @Param('id') id: string, @Body() dto: QuoteReplyDto) {
        return this.quoteRequestsService.quote(req.user.userId, id, dto);
    }

    @Patch(':id/accept')
    @ApiOperation({ summary: 'Traveller accepts — quote + scale + timestamp snapshotted immutably (no payment step in beta)' })
    accept(@Request() req, @Param('id') id: string) {
        return this.quoteRequestsService.accept(req.user.userId, id);
    }

    @Patch(':id/decline')
    @ApiOperation({ summary: 'Agency declines the request' })
    decline(@Request() req, @Param('id') id: string) {
        return this.quoteRequestsService.decline(req.user.userId, id);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Traveller cancels the request' })
    cancel(@Request() req, @Param('id') id: string) {
        return this.quoteRequestsService.cancel(req.user.userId, id);
    }
}
