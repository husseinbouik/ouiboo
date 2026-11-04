import { createHmac } from 'node:crypto';
import { MessagingService } from './messaging.service';
import { FakeMessagingProvider } from './providers/fake-messaging.provider';
import { TwilioMessagingProvider } from './providers/twilio-messaging.provider';
import { resolveMessagingProvider } from './messaging.module';
import {
  MESSAGING_TEMPLATES,
  getMessagingTemplate,
  normalizeMessagingLocale,
  renderSmsBody,
  templateVariables,
} from './messaging-templates';

const PHONE = '+212612345678';
const ENV_KEYS = [
  'MESSAGING_ENABLED',
  'SMS_ENABLED',
  'WHATSAPP_ENABLED',
  'MESSAGING_WEBHOOK_SECRET',
  'MESSAGING_ACCOUNT_SID',
  'MESSAGING_AUTH_TOKEN',
  'MESSAGING_SMS_FROM',
  'MESSAGING_WHATSAPP_FROM',
] as const;

describe('#785 messaging integration (dormant by default)', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const makeService = (optedIn: boolean) => {
    const fake = new FakeMessagingProvider();
    const prisma: any = {
      notificationPreference: {
        findUnique: jest.fn(async () => ({ smsNotifications: optedIn })),
      },
    };
    return { service: new MessagingService(prisma, fake), fake };
  };

  describe('templates', () => {
    it('has fr/ar/en templates for every event, fr default', () => {
      for (const event of Object.keys(MESSAGING_TEMPLATES) as Array<
        keyof typeof MESSAGING_TEMPLATES
      >) {
        for (const locale of ['fr', 'ar', 'en'] as const) {
          const t = MESSAGING_TEMPLATES[event][locale];
          expect(t.whatsappTemplateId).toContain(locale);
          expect(t.smsBody.length).toBeGreaterThan(10);
          expect(t.smsBody.toLowerCase()).not.toContain('commission');
        }
      }
      expect(normalizeMessagingLocale('xx')).toBe('fr');
      expect(normalizeMessagingLocale(null)).toBe('fr');
      expect(normalizeMessagingLocale('AR')).toBe('ar');
    });

    it('renders sms bodies and ordered whatsapp variables per locale', () => {
      const fr = getMessagingTemplate('BOOKING_CONFIRMATION', 'fr');
      expect(renderSmsBody(fr, { tripTitle: 'Atlas Trek', bookingId: 'B1' })).toContain(
        'Atlas Trek',
      );
      expect(templateVariables(fr, { tripTitle: 'Atlas Trek', bookingId: 'B1' })).toEqual([
        'Atlas Trek',
        'B1',
      ]);
      const ar = getMessagingTemplate('BOOKING_CONFIRMATION', 'ar');
      expect(renderSmsBody(ar, { tripTitle: 'X', bookingId: 'B2' })).toContain('B2');
    });
  });

  describe('flag gating', () => {
    it('is a strict no-op when all flags are off (default)', async () => {
      const { service, fake } = makeService(true);
      const sent = await service.notifyEvent({
        userId: 'u1',
        phone: PHONE,
        locale: 'fr',
        event: 'BOOKING_CONFIRMATION',
        variables: { tripTitle: 'T', bookingId: 'B1' },
      });
      expect(sent).toBe(0);
      expect(fake.sends).toHaveLength(0);
      expect(service.isMessagingEnabled()).toBe(false);
    });

    it('stays off when only the global flag is on (channel flags off)', async () => {
      process.env.MESSAGING_ENABLED = 'true';
      const { service, fake } = makeService(true);
      const sent = await service.notifyEvent({
        userId: 'u1',
        phone: PHONE,
        event: 'CANCELLATION',
        variables: { tripTitle: 'T', bookingId: 'B1' },
      });
      expect(sent).toBe(0);
      expect(fake.sends).toHaveLength(0);
    });

    it('does not send without a phone or without user opt-in', async () => {
      process.env.MESSAGING_ENABLED = 'true';
      process.env.SMS_ENABLED = 'true';
      process.env.WHATSAPP_ENABLED = 'true';

      const noPhone = makeService(true);
      expect(
        await noPhone.service.notifyEvent({
          userId: 'u1',
          phone: null,
          event: 'BOOKING_CONFIRMATION',
          variables: { tripTitle: 'T', bookingId: 'B1' },
        }),
      ).toBe(0);
      expect(noPhone.fake.sends).toHaveLength(0);

      const optedOut = makeService(false);
      expect(
        await optedOut.service.notifyEvent({
          userId: 'u1',
          phone: PHONE,
          event: 'BOOKING_CONFIRMATION',
          variables: { tripTitle: 'T', bookingId: 'B1' },
        }),
      ).toBe(0);
      expect(optedOut.fake.sends).toHaveLength(0);
    });

    it('sends via the fake provider only when flags on + phone + opt-in', async () => {
      process.env.MESSAGING_ENABLED = 'true';
      process.env.WHATSAPP_ENABLED = 'true';
      const { service, fake } = makeService(true);
      const sent = await service.notifyEvent({
        userId: 'u1',
        phone: PHONE,
        locale: 'en',
        event: 'BOOKING_CONFIRMATION',
        variables: { tripTitle: 'Atlas Trek', bookingId: 'B9' },
      });
      expect(sent).toBe(1); // whatsapp only; sms flag still off
      expect(fake.sends).toHaveLength(1);
      expect(fake.sends[0].channel).toBe('whatsapp');
      expect(fake.sends[0].templateId).toBe('ouiboo_booking_confirmed_en');
      expect(fake.sends[0].variables).toEqual(['Atlas Trek', 'B9']);
      // delivery log stores only the masked number
      expect(service.getDeliveries()[0].toMasked).not.toContain('612345');
    });
  });

  describe('webhooks', () => {
    it('rejects signatures when the secret is unset or wrong, accepts valid', () => {
      const { service } = makeService(false);
      const body = '{"MessageSid":"SM1","MessageStatus":"delivered"}';
      expect(service.verifyWebhookSignature(body, 'abc')).toBe(false);

      process.env.MESSAGING_WEBHOOK_SECRET = 'test-webhook-secret';
      const good = createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
      expect(service.verifyWebhookSignature(body, good)).toBe(true);
      expect(service.verifyWebhookSignature(body, `sha256=${good}`)).toBe(true);
      expect(service.verifyWebhookSignature(body, 'deadbeef')).toBe(false);
      expect(service.verifyWebhookSignature(body, undefined)).toBe(false);
    });

    it('records webhook events idempotently (redelivery is a no-op)', () => {
      const { service } = makeService(false);
      const evt = {
        providerEventId: 'SM123',
        channel: 'sms' as const,
        status: 'delivered',
        fromPhone: PHONE,
      };
      expect(service.recordWebhookEvent(evt)).toEqual({ recorded: true, duplicate: false });
      expect(service.recordWebhookEvent(evt)).toEqual({ recorded: false, duplicate: true });
      expect(service.getDeliveries()).toHaveLength(1);
      expect(service.getDeliveries()[0].toMasked).not.toContain('612345');
    });
  });

  describe('provider resolution', () => {
    it('binds the fake provider unless enabled AND configured', () => {
      expect(resolveMessagingProvider().name).toBe('fake');
      process.env.MESSAGING_ENABLED = 'true';
      expect(resolveMessagingProvider().name).toBe('fake');
      process.env.MESSAGING_ACCOUNT_SID = 'AC-test';
      process.env.MESSAGING_AUTH_TOKEN = 'test-token';
      process.env.MESSAGING_SMS_FROM = '+10000000000';
      expect(resolveMessagingProvider().name).toBe('twilio');
    });

    it('twilio skeleton posts a twilio-style form payload (fake fetch)', async () => {
      const calls: Array<{ url: string; init: any }> = [];
      const fetchFn: any = async (url: string, init: any) => {
        calls.push({ url, init });
        return { ok: true, json: async () => ({ sid: 'SM999', status: 'queued' }) };
      };
      const provider = new TwilioMessagingProvider({
        accountSid: 'AC-test',
        authToken: 'test-token',
        smsFrom: '+10000000000',
        whatsappFrom: '+10000000001',
        fetchFn,
      });
      const sms = await provider.sendSms({ to: PHONE, body: 'hello' });
      expect(sms).toEqual({ providerMessageId: 'SM999', status: 'queued' });
      expect(calls[0].url).toContain('/Accounts/AC-test/Messages.json');
      expect(String(calls[0].init.body)).toContain('Body=hello');

      const wa = await provider.sendWhatsAppTemplate({
        to: PHONE,
        templateId: 'ouiboo_booking_confirmed_en',
        language: 'en',
        variables: ['T', 'B1'],
      });
      expect(wa.status).toBe('queued');
      expect(decodeURIComponent(String(calls[1].init.body))).toContain('whatsapp:');
    });
  });
});
