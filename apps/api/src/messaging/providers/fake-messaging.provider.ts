import { Injectable } from '@nestjs/common';
import {
  MessagingProvider,
  MessagingSendResult,
  SendSmsInput,
  SendWhatsAppTemplateInput,
} from '../messaging-provider.interface';

export interface RecordedSend {
  channel: 'sms' | 'whatsapp';
  to: string;
  body?: string;
  templateId?: string;
  language?: string;
  variables?: string[];
  at: Date;
}

/**
 * #785: fake provider — records every send in memory and performs NO
 * network I/O. This is the provider bound whenever messaging is not
 * fully configured/enabled, and the provider used by all tests, so CI
 * can prove the whole integration without a BSP account or spend.
 */
@Injectable()
export class FakeMessagingProvider implements MessagingProvider {
  readonly name = 'fake';
  readonly sends: RecordedSend[] = [];
  private counter = 0;

  async sendSms(input: SendSmsInput): Promise<MessagingSendResult> {
    this.sends.push({ channel: 'sms', to: input.to, body: input.body, at: new Date() });
    this.counter += 1;
    return { providerMessageId: `fake-sms-${this.counter}`, status: 'sent' };
  }

  async sendWhatsAppTemplate(
    input: SendWhatsAppTemplateInput,
  ): Promise<MessagingSendResult> {
    this.sends.push({
      channel: 'whatsapp',
      to: input.to,
      templateId: input.templateId,
      language: input.language,
      variables: input.variables,
      at: new Date(),
    });
    this.counter += 1;
    return { providerMessageId: `fake-wa-${this.counter}`, status: 'sent' };
  }

  clear(): void {
    this.sends.length = 0;
  }
}
