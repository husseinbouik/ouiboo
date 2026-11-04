import { Injectable, Logger } from '@nestjs/common';
import {
  MessagingProvider,
  MessagingSendResult,
  SendSmsInput,
  SendWhatsAppTemplateInput,
  maskPhone,
} from '../messaging-provider.interface';

export interface TwilioStyleConfig {
  accountSid: string;
  authToken: string;
  smsFrom: string;
  whatsappFrom: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchFn?: typeof fetch;
}

/**
 * #785: real-provider SKELETON for one mainstream BSP shape
 * (Twilio-style REST: POST /2010-04-01/Accounts/{sid}/Messages.json,
 * HTTP basic auth, form-encoded body; WhatsApp via a `whatsapp:`
 * channel prefix + ContentSid/ContentVariables for approved
 * templates).
 *
 * DORMANT BY CONSTRUCTION: MessagingModule instantiates this class
 * ONLY when MESSAGING_ENABLED=true AND SMS/WHATSAPP config is present.
 * No BSP account has been opened, no credentials exist in code or env
 * examples, and nothing here runs in CI (tests inject a fake fetch).
 * Choosing/funding the actual BSP is a founder-hands step (#785).
 */
@Injectable()
export class TwilioMessagingProvider implements MessagingProvider {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioMessagingProvider.name);
  private readonly fetchFn: typeof fetch;

  constructor(private readonly config: TwilioStyleConfig) {
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async sendSms(input: SendSmsInput): Promise<MessagingSendResult> {
    return this.postMessage({
      To: input.to,
      From: this.config.smsFrom,
      Body: input.body,
    });
  }

  async sendWhatsAppTemplate(
    input: SendWhatsAppTemplateInput,
  ): Promise<MessagingSendResult> {
    return this.postMessage({
      To: `whatsapp:${input.to}`,
      From: `whatsapp:${this.config.whatsappFrom}`,
      ContentSid: input.templateId,
      ContentVariables: JSON.stringify(
        Object.fromEntries(input.variables.map((v, i) => [String(i + 1), v])),
      ),
    });
  }

  private async postMessage(
    fields: Record<string, string>,
  ): Promise<MessagingSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const auth = Buffer.from(
      `${this.config.accountSid}:${this.config.authToken}`,
    ).toString('base64');
    try {
      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(fields).toString(),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.logger.warn(
          `BSP send failed (${res.status}) for ${maskPhone(fields.To)}`,
        );
        return { status: 'failed', error: `BSP HTTP ${res.status}` };
      }
      return {
        providerMessageId: json?.sid,
        status: json?.status === 'failed' ? 'failed' : 'queued',
      };
    } catch (error) {
      this.logger.warn(
        `BSP send error for ${maskPhone(fields.To)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { status: 'failed', error: 'BSP request error' };
    }
  }
}
