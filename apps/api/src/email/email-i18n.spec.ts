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
