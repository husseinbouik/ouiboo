import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MESSAGING_PROVIDER, MessagingProvider } from './messaging-provider.interface';
import { FakeMessagingProvider } from './providers/fake-messaging.provider';
import { TwilioMessagingProvider } from './providers/twilio-messaging.provider';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';

/**
 * #785: the real BSP provider is instantiated ONLY when messaging is
 * enabled AND the BSP credentials are present in env. In every other
 * state the FakeMessagingProvider is bound (and MessagingService is a
 * flag-gated no-op anyway), so no real message can be sent until the
 * founder completes BSP onboarding and deliberately sets the flags.
 */
export function resolveMessagingProvider(): MessagingProvider {
  const enabled = process.env.MESSAGING_ENABLED === 'true';
  const accountSid = process.env.MESSAGING_ACCOUNT_SID;
  const authToken = process.env.MESSAGING_AUTH_TOKEN;
  const smsFrom = process.env.MESSAGING_SMS_FROM;
  const whatsappFrom = process.env.MESSAGING_WHATSAPP_FROM;
  if (enabled && accountSid && authToken && (smsFrom || whatsappFrom)) {
    return new TwilioMessagingProvider({
      accountSid,
      authToken,
      smsFrom: smsFrom ?? '',
      whatsappFrom: whatsappFrom ?? '',
    });
  }
  return new FakeMessagingProvider();
}

@Module({
  imports: [DatabaseModule],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    { provide: MESSAGING_PROVIDER, useFactory: resolveMessagingProvider },
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
