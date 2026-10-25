import {
  EMAIL_LOCALES,
  EMAIL_STRINGS,
  emailDirection,
  emailStrings,
  fillEmailCopy,
  normalizeEmailLocale,
} from './email-i18n'
import { EmailService } from './email.service'

function keySet(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keySet(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('email i18n (#424)', () => {
  it('keeps identical key sets across en/fr/ar — a missing translation fails CI', () => {
    const enKeys = keySet(EMAIL_STRINGS.en).sort()
    for (const locale of EMAIL_LOCALES) {
      expect(keySet(EMAIL_STRINGS[locale]).sort()).toEqual(enKeys)
    }
  })

  it('has no empty strings in any locale', () => {
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        expect({ path, empty: value.trim().length === 0 }).toEqual({ path, empty: false })
        return
      }
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, path ? `${path}.${key}` : key)
      }
    }
    for (const locale of EMAIL_LOCALES) walk(EMAIL_STRINGS[locale], locale)
  })

  it('normalizes locale input and falls back to English', () => {
    expect(normalizeEmailLocale('fr')).toBe('fr')
    expect(normalizeEmailLocale('ar-MA')).toBe('ar')
    expect(normalizeEmailLocale('EN-us')).toBe('en')
    expect(normalizeEmailLocale('de')).toBe('en')
    expect(normalizeEmailLocale(null)).toBe('en')
    expect(normalizeEmailLocale(undefined)).toBe('en')
  })

  it('marks Arabic as RTL and the other locales as LTR', () => {
    expect(emailDirection('ar')).toBe('rtl')
    expect(emailDirection('fr')).toBe('ltr')
    expect(emailDirection('en')).toBe('ltr')
  })

  it('fills placeholders and leaves unknown ones untouched', () => {
    expect(fillEmailCopy('Hi {{name}}, trip {{trip}}', { name: 'Amina', trip: 'Atlas' })).toBe(
      'Hi Amina, trip Atlas',
    )
    expect(fillEmailCopy('Hi {{name}}', {})).toBe('Hi {{name}}')
  })
})

describe('localized transactional templates (#424)', () => {
  const service = new EmailService()

  it('renders the OTP email in French with lang="fr"', () => {
    const html = service.getOTPTemplate('123456', 'fr')
    expect(html).toContain('<html lang="fr" dir="ltr">')
    expect(html).toContain('Vérifiez votre adresse e-mail')
    expect(html).not.toContain('Verify your email address')
    expect(service.generateOTPSubject('fr')).toBe('Ouiboo : Vérifiez votre adresse e-mail')
  })

  it('renders the OTP email in Arabic with dir="rtl"', () => {
    const html = service.getOTPTemplate('123456', 'ar')
    expect(html).toContain('<html lang="ar" dir="rtl">')
    expect(html).toContain('تحقق من بريدك الإلكتروني')
  })

  it('renders the payment confirmation fully in French', () => {
    const t = emailStrings('fr').paymentConfirmation
    expect(t.heading).toBe('Votre réservation est confirmée')
    expect(t.subject).toContain('Réservation confirmée')
  })

  it('keeps English as the default when no locale is recorded', () => {
    const html = service.getOTPTemplate('123456')
    expect(html).toContain('<html lang="en" dir="ltr">')
    expect(html).toContain('Verify your email address')
    const htmlNull = service.getOTPTemplate('123456', null)
    expect(htmlNull).toContain('<html lang="en" dir="ltr">')
  })

  it('sends the booking confirmation with a French subject and body', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'm-fr' })
    const localized = new EmailService()
    ;(localized as any).transporter = { sendMail }
    process.env.SMTP_USER = 'delivery@ouiboo.test'

    await localized.sendPaymentConfirmation('traveler@example.com', 'Atlas Trek', 'fr')

    expect(sendMail).toHaveBeenCalledTimes(1)
    const mail = sendMail.mock.calls[0][0]
    expect(mail.subject).toBe('Ouiboo : Réservation confirmée — Atlas Trek')
    expect(mail.html).toContain('<html lang="fr" dir="ltr">')
    expect(mail.html).toContain('Votre réservation est confirmée')
    expect(mail.text).toContain('Votre réservation est confirmée')
  })

  it('sends the booking-received email in Arabic with the prevailing-language clause', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'm-ar' })
    const localized = new EmailService()
    ;(localized as any).transporter = { sendMail }
    process.env.SMTP_USER = 'delivery@ouiboo.test'

    await localized.sendBookingNotification(
      'traveler@example.com',
      'agency@example.com',
      'booking-1',
      'Atlas Trek',
      'ar',
    )

    expect(sendMail).toHaveBeenCalledTimes(2)
    const travelerMail = sendMail.mock.calls
      .map((call: any[]) => call[0])
      .find((mail: any) => mail.to === 'traveler@example.com')
    expect(travelerMail.subject).toContain('تم استلام الحجز')
    expect(travelerMail.html).toContain('<html lang="ar" dir="rtl">')
    expect(travelerMail.html).toContain(emailStrings('ar').prevailingLanguage)

    const agencyMail = sendMail.mock.calls
      .map((call: any[]) => call[0])
      .find((mail: any) => mail.to === 'agency@example.com')
    expect(agencyMail.html).toContain('<html lang="en" dir="ltr">')
  })
})

describe('EmailService — every template renders in FR and AR (#424)', () => {
    const service = new EmailService();

    // One call per public template getter, exercised per locale below.
    const renders: Array<[string, (locale: 'fr' | 'ar') => string]> = [
        ['subscription renewal', (l) => service.getSubscriptionRenewalReminderTemplate('Atlas', '12 Nov 2026', 'https://x/billing', l)],
        ['otp', (l) => service.getOTPTemplate('123456', l)],
        ['welcome', (l) => service.getWelcomeTemplate('Sara', l)],
        ['password reset', (l) => service.getPasswordResetTemplate('https://x/reset', l)],
        ['payment reminder', (l) => service.getPaymentReminderTemplate('Atlas Trek', 48, 'https://x/b', l)],
        ['trip reminder d7', (l) => service.getTripReminderTemplate('Atlas Trek', 7, 'Atlas', 'https://x/t', l)],
        ['trip reminder d1', (l) => service.getTripReminderTemplate('Atlas Trek', 1, 'Atlas', 'https://x/t', l)],
        ['review request', (l) => service.getReviewRequestTemplate('Atlas Trek', 'Atlas', 'https://x/r', l)],
        ['auto cancellation', (l) => service.getAutoUnpaidCancellationTemplate('Atlas Trek', 'bk-1', l)],
        ['verification paused', (l) => service.getAgencyVerificationPausedTemplate('Licence expired', 2, 'https://x/v', l)],
        ['refund action', (l) => service.getRefundActionRequiredTemplate('bk-1', 'https://x/r', l)],
    ];

    it.each(renders)('%s renders in fr and ar with no unresolved placeholders', (_name, render) => {
        for (const locale of ['fr', 'ar'] as const) {
            const out = render(locale);
            expect(out.length).toBeGreaterThan(0);
            expect(out).not.toContain('{{');
            expect(out).not.toContain('undefined');
            expect(out).toContain(locale === 'ar' ? 'dir="rtl"' : 'lang="fr"');
        }
    });

    it('agency subject getters return distinct copy per locale', () => {
        for (const get of [
            (l?: string) => service.getAgencyVerificationPausedSubject(l),
            (l?: string) => service.getRefundActionRequiredSubject(l),
        ]) {
            const [en, fr, ar] = [get(), get('fr'), get('ar')];
            expect(fr).not.toBe(en);
            expect(ar).not.toBe(en);
        }
    });

    it('job-driven sends use the booking locale for subject and html', async () => {
        const sent: Array<{ subject?: string; html?: string }> = [];
        (service as unknown as { transporter: unknown }).transporter = {
            sendMail: jest.fn(async (opts: { subject?: string; html?: string }) => {
                sent.push(opts);
                return { messageId: 'm' };
            }),
        };
        await service.sendPaymentReminder('sara@example.com', 'Atlas Trek', 48, 'https://x/bookings/b1', 'ar');
        await service.sendTripReminder('sara@example.com', 'Atlas Trek', 7, 'Atlas', 'https://x/trip/t1', 'fr');
        await service.sendTripReminder('sara@example.com', 'Atlas Trek', 1, 'Atlas', 'https://x/trip/t1');
        await service.sendReviewRequest('sara@example.com', 'Atlas Trek', 'Atlas', 'https://x/reviews/t1', 'ar');
        await service.sendAutoUnpaidCancellationNotice('sara@example.com', 'Atlas Trek', 'b1', 'fr');
        await service.sendSubscriptionRenewalReminder('atlas@example.com', 'Atlas', '12 Nov 2026', 'https://x/billing');
        expect(sent).toHaveLength(6);
        expect(sent[0].subject).toBe(fillEmailCopy(emailStrings('ar').paymentReminder.subject, { tripTitle: 'Atlas Trek' }));
        expect(sent[0].html).toContain('dir="rtl"');
        expect(sent[1].subject).toBe(fillEmailCopy(emailStrings('fr').tripReminder.subject, { tripTitle: 'Atlas Trek' }));
        expect(sent[2].subject).toBe(fillEmailCopy(emailStrings('en').tripReminder.subject, { tripTitle: 'Atlas Trek' }));
        expect(sent[3].subject).toBe(fillEmailCopy(emailStrings('ar').reviewRequest.subject, { tripTitle: 'Atlas Trek' }));
        expect(sent[4].subject).toBe(fillEmailCopy(emailStrings('fr').autoUnpaidCancellation.subject, { tripTitle: 'Atlas Trek' }));
        expect(sent[5].subject).toBe(emailStrings('en').subscriptionRenewal.subject);
    });
});

describe('EmailService — auth sends honor the locale (#424)', () => {
    it('sendOTP / sendWelcomeEmail / sendPasswordResetEmail use dictionary subjects + lang/dir', async () => {
        const service = new EmailService();
        const sent: Array<{ subject?: string; html?: string }> = [];
        (service as unknown as { transporter: unknown }).transporter = {
            sendMail: jest.fn(async (opts: { subject?: string; html?: string }) => {
                sent.push(opts);
                return { messageId: 'm' };
            }),
        };
        await service.sendOTP('sara@example.com', '123456', 'fr');
        await service.sendWelcomeEmail('sara@example.com', 'Sara', 'ar');
        await service.sendPasswordResetEmail('sara@example.com', 'https://x/reset', 'fr');
        expect(sent).toHaveLength(3);
        expect(sent[0].subject).toBe(emailStrings('fr').otp.subject);
        expect(sent[0].html).toContain('lang="fr"');
        expect(sent[1].subject).toBe(emailStrings('ar').welcome.subject);
        expect(sent[1].html).toContain('dir="rtl"');
        expect(sent[2].subject).toBe(emailStrings('fr').passwordReset.subject);
    });
});
