import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { maskPhone } from './messaging-provider.interface';

/**
 * #785: inbound BSP webhooks — delivery-status callbacks and inbound
 * messages. Signature-verified (HMAC-SHA256 over the raw body with
 * MESSAGING_WEBHOOK_SECRET); verification fails closed when the secret
 * is unset, so the endpoint is inert until a BSP is configured.
 * Phone numbers are never logged in full.
 */
@Controller('messaging/webhooks')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('provider')
  @HttpCode(200)
  async providerWebhook(
    @Req() req: any,
    @Headers('x-messaging-signature') signature: string | undefined,
    @Body() body: any,
  ) {
    const rawBody: string = req?.rawBody
      ? req.rawBody.toString()
      : JSON.stringify(body ?? {});
    if (!this.messaging.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid messaging webhook signature');
    }

    // Twilio-style field names (MessageSid / MessageStatus / From);
    // generic id/status/from accepted as well.
    const providerEventId =
      body?.MessageSid ?? body?.SmsSid ?? body?.id ?? body?.eventId;
    if (!providerEventId) {
      return { received: true, recorded: false };
    }
    const status = body?.MessageStatus ?? body?.status ?? 'unknown';
    const isInbound = Boolean(body?.Body) && Boolean(body?.From);
    let channel: 'inbound' | 'sms' | 'whatsapp' = 'whatsapp';
    if (isInbound) channel = 'inbound';
    else if (body?.Channel === 'sms') channel = 'sms';
    const result = this.messaging.recordWebhookEvent({
      providerEventId: String(providerEventId),
      channel,
      status: isInbound ? 'inbound' : String(status),
      fromPhone: body?.From ?? null,
    });
    if (isInbound && body?.From) {
      // Deliberately no message body / full number in logs.
      console.log(`Inbound messaging webhook from ${maskPhone(String(body.From))}`);
    }
    return { received: true, ...result };
  }
}
