import { Injectable, Logger, Optional } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { DatabaseService } from '../database/database.service'
import * as nodemailer from 'nodemailer'
import {
  emailButton,
  emailHeading,
  emailPanel,
  emailParagraph,
  emailStrong,
  emailToPlainText,
  escapeHtml,
  maskEmail,
  renderEmail,
  renderMarketingEmail,
  sanitizeEmailSubject,
} from './email-template'
import {
  emailStrings,
  fillEmailCopy,
  normalizeEmailLocale,
  type EmailLocale,
} from './email-i18n'

@Injectable()
export class EmailService {
  private transporter?: nodemailer.Transporter
  private readonly logger = new Logger(EmailService.name)

  constructor(@Optional() private readonly db?: DatabaseService) {
    const host = process.env.SMTP_HOST
    const port = Number.parseInt(process.env.SMTP_PORT || '587', 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        })
        this.logger.log(`Email delivery initialized (${host}:${port})`)
      } catch (error) {
        this.logger.error('Failed to initialize email delivery', error)
      }
    } else {
      const missing = [
        !host && 'SMTP_HOST',
        !user && 'SMTP_USER',
        !pass && 'SMTP_PASS',
      ].filter(Boolean)
      this.logger.warn(`Email delivery is not configured. Missing: ${missing.join(', ')}`)
    }
  }

  isConfigured(): boolean {
    return Boolean(this.transporter)
  }

  async sendEmail(to: string, subject: string, html: string, headers?: Record<string, string>) {
    const safeSubject = sanitizeEmailSubject(subject)
    const maskedRecipient = maskEmail(to)

    if (!this.transporter) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Email delivery is unavailable')
      }
      this.logger.warn(`[EMAIL NOT SENT] To: ${maskedRecipient} | Subject: ${safeSubject}`)
      if (process.env.LOG_EMAIL_BODIES === 'true') {
        this.logger.debug(`[LOCAL EMAIL BODY] ${html}`)
      }
      return
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"Ouiboo" <${process.env.SMTP_USER}>`,
        to,
        subject: safeSubject,
        html,
        text: emailToPlainText(html),
        headers,
      })
      this.logger.log(`Email sent to ${maskedRecipient}. MessageId: ${result.messageId}`)
      return result
    } catch (error) {
      this.logger.error(`Email delivery failed for ${maskedRecipient}`, error)
      throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    return this.sendEmail(to, subject, html)
  }

  // --- Marketing email compliance (#322) -------------------------------------
  // Marketing sends are fail-closed: no postal address configured, no
  // suppression check available, or a suppressed address all stop the send.
  // Transactional mail never passes through this path.

  private unsubscribeSecret(): string {
    const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET
    if (secret) return secret
    if (process.env.NODE_ENV === 'production') {
      throw new Error('UNSUBSCRIBE_SECRET or JWT_SECRET must be configured for marketing email')
    }
    return 'development-unsubscribe-secret'
  }

  createUnsubscribeToken(email: string): string {
    const normalized = email.trim().toLowerCase()
    const payload = Buffer.from(normalized, 'utf8').toString('base64url')
    const signature = createHmac('sha256', this.unsubscribeSecret()).update(normalized).digest('base64url')
    return `${payload}.${signature}`
  }

  verifyUnsubscribeToken(token: string): string | null {
    const [payload, signature] = (token || '').split('.')
    if (!payload || !signature) return null
    let email: string
    try {
      email = Buffer.from(payload, 'base64url').toString('utf8')
    } catch {
      return null
    }
    const expected = createHmac('sha256', this.unsubscribeSecret()).update(email).digest('base64url')
    const given = Buffer.from(signature)
    const wanted = Buffer.from(expected)
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null
    return email
  }

  buildUnsubscribeUrl(email: string): string {
    const base = (process.env.API_PUBLIC_URL || 'https://ouiboo-api.vercel.app').replace(/\/+$/, '')
    return `${base}/api/v1/email/unsubscribe?t=${this.createUnsubscribeToken(email)}`
  }

  async isSuppressed(email: string): Promise<boolean> {
    if (!this.db) return false
    const row = await this.db.emailSuppression.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    return Boolean(row)
  }

  async suppressEmail(email: string, reason = 'unsubscribe'): Promise<void> {
    if (!this.db) throw new Error('Database unavailable: cannot record email suppression')
    const normalized = email.trim().toLowerCase()
    await this.db.emailSuppression.upsert({
      where: { email: normalized },
      create: { email: normalized, reason },
      update: {},
    })
  }

  async sendMarketingEmail(
    to: string,
    subject: string,
    emailContent: { title: string; preheader: string; content: string },
  ) {
    const postalAddress = process.env.OUIBOO_POSTAL_ADDRESS
    if (!postalAddress) {
      throw new Error('Marketing email blocked: OUIBOO_POSTAL_ADDRESS is not configured')
    }
    if (!this.db) {
      throw new Error('Marketing email blocked: suppression list unavailable')
    }
    const normalized = to.trim().toLowerCase()
    if (await this.isSuppressed(normalized)) {
      this.logger.log(`Marketing email skipped for suppressed address ${maskEmail(normalized)}`)
      return { skipped: true as const, reason: 'suppressed' as const }
    }
    const unsubscribeUrl = this.buildUnsubscribeUrl(normalized)
    const html = renderMarketingEmail({ ...emailContent, unsubscribeUrl, postalAddress })
    const result = await this.sendEmail(normalized, subject, html, {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
    return { skipped: false as const, result }
  }

  getSubscriptionRenewalReminderTemplate(companyName: string, renewalDateLabel: string, billingUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).subscriptionRenewal
    const content = `
      ${emailHeading(t.heading)}
      ${emailParagraph(fillEmailCopy(t.body, { companyName, renewalDate: renewalDateLabel }))}
      ${emailParagraph(t.bodyCancellation)}
      ${emailButton(t.button, billingUrl)}
      ${emailPanel(t.panel, 'neutral', resolved)}
    `
    return renderEmail({
      title: t.title,
      preheader: fillEmailCopy(t.preheader, { renewalDate: renewalDateLabel }),
      content,
      locale: resolved,
    })
  }

  async sendSubscriptionRenewalReminder(email: string, companyName: string, renewalDateLabel: string, billingUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const html = this.getSubscriptionRenewalReminderTemplate(companyName, renewalDateLabel, billingUrl, resolved)
    return this.sendEmail(email, emailStrings(resolved).subscriptionRenewal.subject, html)
  }

  getOTPTemplate(otp: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).otp
    const content = `
      ${emailHeading(t.heading)}
      ${emailParagraph(t.intro)}
      <div style="margin:26px 0;text-align:center;">
        <div style="display:inline-block;padding:15px 24px;border-radius:14px;background:#071B33;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:0.36em;">${escapeHtml(otp)}</div>
      </div>
      ${emailPanel(t.expiry, 'neutral', resolved)}
      ${emailParagraph(t.ignore)}`
    return renderEmail({ title: t.title, preheader: t.preheader, content, locale: resolved })
  }

  getWelcomeTemplate(name?: string | null, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).welcome
    const greeting = name?.trim() ? fillEmailCopy(t.greetingWithName, { name: name.trim() }) : t.greeting
    const content = `
      ${emailHeading(greeting)}
      ${emailParagraph(t.bodyVerified)}
      ${emailParagraph(t.bodyExplore)}`
    return renderEmail({ title: t.title, preheader: t.preheader, content, locale: resolved })
  }

  async sendOTP(to: string, otp: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(to, this.generateOTPSubject(resolved), this.getOTPTemplate(otp, resolved))
  }

  generateOTPSubject(locale?: EmailLocale | string | null) {
    return emailStrings(locale).otp.subject
  }

  async sendWelcomeEmail(to: string, name?: string | null, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(to, emailStrings(resolved).welcome.subject, this.getWelcomeTemplate(name, resolved))
  }

  getPasswordResetTemplate(resetUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).passwordReset
    const content = `
      ${emailHeading(t.heading)}
      ${emailParagraph(t.intro)}
      ${emailButton(t.button, resetUrl)}
      ${emailPanel(t.panel, 'neutral', resolved)}`
    return renderEmail({ title: t.title, preheader: t.preheader, content, locale: resolved })
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(to, emailStrings(resolved).passwordReset.subject, this.getPasswordResetTemplate(resetUrl, resolved))
  }

  /**
   * #424: the traveller's copy renders in `locale` (their checkout
   * language, persisted on the booking). The agency copy keeps the
   * default locale — no agency language preference is recorded yet.
   * The traveller copy carries the prevailing-language clause next to
   * the booking terms it confirms.
   */
  async sendBookingNotification(travelerEmail: string, agencyEmail: string, bookingId: string, tripTitle: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).bookingReceived
    const travelerContent = `
      ${emailHeading(t.heading)}
      ${emailParagraph(fillEmailCopy(t.body, { tripTitle }))}
      ${emailPanel(`${escapeHtml(t.panelReference)} ${emailStrong(bookingId)}<br>${escapeHtml(t.panelNextStep)}`, 'neutral', resolved)}
      ${emailParagraph(emailStrings(resolved).prevailingLanguage)}`
    const agencyStrings = emailStrings().bookingNewAgency
    const agencyContent = `
      ${emailHeading(agencyStrings.heading)}
      ${emailParagraph(fillEmailCopy(agencyStrings.body, { tripTitle }))}
      ${emailPanel(`${escapeHtml(agencyStrings.panelReference)} ${emailStrong(bookingId)}<br>${escapeHtml(agencyStrings.panelTraveler)} ${emailStrong(travelerEmail)}<br>${escapeHtml(agencyStrings.panelReview)}`)}`

    await Promise.all([
      this.sendEmail(travelerEmail, fillEmailCopy(t.subject, { tripTitle }), renderEmail({ title: t.title, preheader: fillEmailCopy(t.preheader, { tripTitle }), content: travelerContent, locale: resolved })),
      this.sendEmail(agencyEmail, agencyStrings.subject, renderEmail({ title: agencyStrings.title, preheader: fillEmailCopy(agencyStrings.preheader, { tripTitle }), content: agencyContent })),
    ])
  }

  async sendPaymentConfirmation(travelerEmail: string, tripTitle: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).paymentConfirmation
    const content = `
      ${emailHeading(t.heading)}
      ${emailParagraph(fillEmailCopy(t.body, { tripTitle }))}
      ${emailPanel(escapeHtml(t.panel), 'neutral', resolved)}`
    await this.sendEmail(travelerEmail, fillEmailCopy(t.subject, { tripTitle }), renderEmail({ title: t.title, preheader: fillEmailCopy(t.preheader, { tripTitle }), content, locale: resolved }))
  }

  getPaymentReminderTemplate(tripTitle: string, hoursUntilPaymentDue: number, bookingDashboardUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).paymentReminder
    const hours = Math.max(0, Math.floor(hoursUntilPaymentDue))
    const content = `
      ${emailHeading(t.heading)}
      ${emailParagraph(fillEmailCopy(hours === 1 ? t.bodyOne : t.bodyOther, { tripTitle, hours }))}
      ${emailPanel(escapeHtml(t.panel), 'neutral', resolved)}
      ${emailButton(t.button, bookingDashboardUrl)}
      ${emailParagraph(t.alreadyUploaded)}`
    return renderEmail({ title: t.title, preheader: fillEmailCopy(t.preheader, { tripTitle }), content, locale: resolved })
  }

  async sendPaymentReminder(travelerEmail: string, tripTitle: string, hoursUntilPaymentDue: number, bookingDashboardUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(travelerEmail, fillEmailCopy(emailStrings(resolved).paymentReminder.subject, { tripTitle }), this.getPaymentReminderTemplate(tripTitle, hoursUntilPaymentDue, bookingDashboardUrl, resolved))
  }

  getTripReminderTemplate(tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).tripReminder
    const timing = daysUntilTrip === 7
      ? t.timingOneWeek
      : daysUntilTrip === 1
        ? t.timingTomorrow
        : fillEmailCopy(t.timingInDays, { days: Math.max(0, Math.floor(daysUntilTrip)) })
    const content = `
      ${emailHeading(fillEmailCopy(t.heading, { timing }))}
      ${emailParagraph(fillEmailCopy(t.body, { tripTitle, agencyName }))}
      ${emailPanel(`<strong>${escapeHtml(t.panelTitle)}</strong><br>• ${escapeHtml(t.panelDocuments)}<br>• ${escapeHtml(t.panelWeather)}<br>• ${escapeHtml(t.panelItinerary)}<br>• ${escapeHtml(t.panelContact)}`, 'neutral', resolved)}
      ${emailButton(t.button, tripDetailsUrl)}
      ${emailParagraph(t.questions)}`
    return renderEmail({ title: t.title, preheader: fillEmailCopy(t.preheader, { tripTitle, timing }), content, locale: resolved })
  }

  async sendTripReminder(travelerEmail: string, tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(travelerEmail, fillEmailCopy(emailStrings(resolved).tripReminder.subject, { tripTitle }), this.getTripReminderTemplate(tripTitle, daysUntilTrip, agencyName, tripDetailsUrl, resolved))
  }

  getReviewRequestTemplate(tripTitle: string, agencyName: string, reviewUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).reviewRequest
    const content = `
      ${emailHeading(fillEmailCopy(t.heading, { agencyName }))}
      ${emailParagraph(fillEmailCopy(t.body, { tripTitle }))}
      ${emailPanel(`<strong>${escapeHtml(t.panelTitle)}</strong><br>${escapeHtml(t.panelBody)}`, 'warning', resolved)}
      ${emailButton(t.button, reviewUrl)}
      ${emailParagraph(t.note)}`
    return renderEmail({ title: t.title, preheader: fillEmailCopy(t.preheader, { tripTitle }), content, locale: resolved })
  }

  async sendReviewRequest(travelerEmail: string, tripTitle: string, agencyName: string, reviewUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(travelerEmail, fillEmailCopy(emailStrings(resolved).reviewRequest.subject, { tripTitle }), this.getReviewRequestTemplate(tripTitle, agencyName, reviewUrl, resolved))
  }

  getAutoUnpaidCancellationTemplate(tripTitle: string, bookingId: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).autoUnpaidCancellation
    const content = `
      ${emailHeading(t.heading)}
      ${emailParagraph(fillEmailCopy(t.body, { tripTitle }))}
      ${emailPanel(`${escapeHtml(t.panelReference)} ${emailStrong(bookingId)}<br>${escapeHtml(t.panelNoProof)}`, 'danger', resolved)}
      ${emailParagraph(t.closing)}`
    return renderEmail({ title: t.title, preheader: fillEmailCopy(t.preheader, { tripTitle }), content, locale: resolved })
  }

  async sendAutoUnpaidCancellationNotice(travelerEmail: string, tripTitle: string, bookingId: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    await this.sendEmail(travelerEmail, fillEmailCopy(emailStrings(resolved).autoUnpaidCancellation.subject, { tripTitle }), this.getAutoUnpaidCancellationTemplate(tripTitle, bookingId, resolved))
  }

  /** #424: agency verification-paused notice (moved from
   * AgencyComplianceService so its copy lives in the locale table). */
  getAgencyVerificationPausedTemplate(reason: string, tripsPaused: number, onboardingUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).agencyVerificationPaused
    const tripsLine = tripsPaused > 0 ? fillEmailCopy(t.tripsLine, { count: tripsPaused }) : ''
    const content =
      emailHeading(t.heading) +
      emailParagraph(fillEmailCopy(t.body, { reason, tripsLine })) +
      emailParagraph(fillEmailCopy(t.renew, { url: onboardingUrl }))
    return renderEmail({ title: t.title, preheader: t.preheader, content, locale: resolved })
  }

  getAgencyVerificationPausedSubject(locale?: EmailLocale | string | null) {
    return emailStrings(locale).agencyVerificationPaused.subject
  }

  /** #424: agency refund-action notice (moved from RefundsService so its
   * copy lives in the locale table). */
  getRefundActionRequiredTemplate(bookingId: string, refundsUrl: string, locale?: EmailLocale | string | null) {
    const resolved = normalizeEmailLocale(locale)
    const t = emailStrings(resolved).refundActionRequired
    const content =
      emailHeading(t.heading) +
      emailParagraph(fillEmailCopy(t.body, { bookingId })) +
      emailParagraph(fillEmailCopy(t.dashboard, { url: refundsUrl }))
    return renderEmail({ title: t.title, preheader: t.preheader, content, locale: resolved })
  }

  getRefundActionRequiredSubject(locale?: EmailLocale | string | null) {
    return emailStrings(locale).refundActionRequired.subject
  }
}
