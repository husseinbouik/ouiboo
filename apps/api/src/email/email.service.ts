import { Injectable, Logger } from '@nestjs/common'
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
  sanitizeEmailSubject,
} from './email-template'

@Injectable()
export class EmailService {
  private transporter?: nodemailer.Transporter
  private readonly logger = new Logger(EmailService.name)

  constructor() {
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

  async sendEmail(to: string, subject: string, html: string) {
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

  getOTPTemplate(otp: string) {
    const content = `
      ${emailHeading('Verify your email address')}
      ${emailParagraph('Use the verification code below to complete your signup and secure your account.')}
      <div style="margin:26px 0;text-align:center;">
        <div style="display:inline-block;padding:15px 24px;border-radius:14px;background:#071B33;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:0.36em;">${escapeHtml(otp)}</div>
      </div>
      ${emailPanel('This code expires in <strong>10 minutes</strong>. If it expires, request a new code from the app.')}
      ${emailParagraph('If you did not create an Ouiboo account, you can safely ignore this email.')}`
    return renderEmail({ title: 'Verify your email address', preheader: 'Your Ouiboo verification code expires in 10 minutes.', content })
  }

  getWelcomeTemplate(name?: string | null) {
    const greeting = name?.trim() ? `Welcome to Ouiboo, ${name.trim()}!` : 'Welcome to Ouiboo!'
    const content = `
      ${emailHeading(greeting)}
      ${emailParagraph('Your email is verified and your account is ready.')}
      ${emailParagraph('You can now explore trips, save favorites, and manage your bookings from one place.')}`
    return renderEmail({ title: 'Welcome to Ouiboo', preheader: 'Your Ouiboo account is ready.', content })
  }

  async sendOTP(to: string, otp: string) {
    await this.sendEmail(to, this.generateOTPSubject(), this.getOTPTemplate(otp))
  }

  generateOTPSubject() {
    return 'Ouiboo: Verify your email address'
  }

  async sendWelcomeEmail(to: string, name?: string | null) {
    await this.sendEmail(to, 'Welcome to Ouiboo', this.getWelcomeTemplate(name))
  }

  getPasswordResetTemplate(resetUrl: string) {
    const content = `
      ${emailHeading('Reset your password')}
      ${emailParagraph('We received a request to reset your Ouiboo password.')}
      ${emailButton('Set a new password', resetUrl)}
      ${emailPanel('This secure link expires in 60 minutes. If you did not request a password reset, ignore this email.')}`
    return renderEmail({ title: 'Reset your password', preheader: 'Use this secure link to reset your Ouiboo password.', content })
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    await this.sendEmail(to, 'Ouiboo: Reset your password', this.getPasswordResetTemplate(resetUrl))
  }

  async sendBookingNotification(travelerEmail: string, agencyEmail: string, bookingId: string, tripTitle: string) {
    const travelerContent = `
      ${emailHeading('We received your booking')}
      ${emailParagraph(`Your booking for ${tripTitle} has been received.`)}
      ${emailPanel(`Booking reference: ${emailStrong(bookingId)}<br>Next step: upload your payment proof from the booking dashboard so the agency can review it.`)}`
    const agencyContent = `
      ${emailHeading('A new booking needs your attention')}
      ${emailParagraph(`A traveler submitted a booking for ${tripTitle}.`)}
      ${emailPanel(`Booking reference: ${emailStrong(bookingId)}<br>Traveler: ${emailStrong(travelerEmail)}<br>Review the booking and payment proof in your agency workspace.`)}`

    await Promise.all([
      this.sendEmail(travelerEmail, `Ouiboo: Booking received — ${tripTitle}`, renderEmail({ title: 'Booking received', preheader: `We received your booking for ${tripTitle}.`, content: travelerContent })),
      this.sendEmail(agencyEmail, 'Ouiboo: New booking received', renderEmail({ title: 'New booking received', preheader: `A new booking was submitted for ${tripTitle}.`, content: agencyContent })),
    ])
  }

  async sendPaymentConfirmation(travelerEmail: string, tripTitle: string) {
    const content = `
      ${emailHeading('Your booking is confirmed')}
      ${emailParagraph(`The agency verified your payment for ${tripTitle}. Your reserved seats are now confirmed.`)}
      ${emailPanel('Keep your booking details available and review the itinerary before departure.')}`
    await this.sendEmail(travelerEmail, `Ouiboo: Booking confirmed — ${tripTitle}`, renderEmail({ title: 'Booking confirmed', preheader: `Your booking for ${tripTitle} is confirmed.`, content }))
  }

  getPaymentReminderTemplate(tripTitle: string, hoursUntilPaymentDue: number, bookingDashboardUrl: string) {
    const hours = Math.max(0, Math.floor(hoursUntilPaymentDue))
    const content = `
      ${emailHeading('Your payment deadline is approaching')}
      ${emailParagraph(`Payment for ${tripTitle} is due in ${hours} hour${hours === 1 ? '' : 's'}. Complete the payment step to keep your booking moving.`)}
      ${emailPanel('Uploading payment proof lets the agency review the transfer and confirm your seats.')}
      ${emailButton('Open booking dashboard', bookingDashboardUrl)}
      ${emailParagraph('Already uploaded your proof? No action is needed while the agency reviews it.')}`
    return renderEmail({ title: 'Payment reminder', preheader: `Payment for ${tripTitle} is due soon.`, content })
  }

  async sendPaymentReminder(travelerEmail: string, tripTitle: string, hoursUntilPaymentDue: number, bookingDashboardUrl: string) {
    await this.sendEmail(travelerEmail, `Ouiboo: Payment reminder — ${tripTitle}`, this.getPaymentReminderTemplate(tripTitle, hoursUntilPaymentDue, bookingDashboardUrl))
  }

  getTripReminderTemplate(tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string) {
    const timing = daysUntilTrip === 7 ? 'one week' : daysUntilTrip === 1 ? 'tomorrow' : `in ${Math.max(0, Math.floor(daysUntilTrip))} days`
    const content = `
      ${emailHeading(`Your trip starts ${timing}`)}
      ${emailParagraph(`${tripTitle}, organized by ${agencyName}, is almost here.`)}
      ${emailPanel('<strong>Before you go</strong><br>• Check your travel documents<br>• Review the weather and packing list<br>• Confirm the itinerary and meeting point<br>• Save the agency contact details')}
      ${emailButton('View trip details', tripDetailsUrl)}
      ${emailParagraph('If you have questions, contact the agency through your Ouiboo booking dashboard.')}`
    return renderEmail({ title: 'Upcoming trip reminder', preheader: `${tripTitle} starts ${timing}.`, content })
  }

  async sendTripReminder(travelerEmail: string, tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string) {
    await this.sendEmail(travelerEmail, `Ouiboo: Your trip starts soon — ${tripTitle}`, this.getTripReminderTemplate(tripTitle, daysUntilTrip, agencyName, tripDetailsUrl))
  }

  getReviewRequestTemplate(tripTitle: string, agencyName: string, reviewUrl: string) {
    const content = `
      ${emailHeading(`How was your trip with ${agencyName}?`)}
      ${emailParagraph(`We hope you enjoyed ${tripTitle}. Your feedback helps travelers make informed choices and helps agencies improve.`)}
      ${emailPanel('<strong>What to include</strong><br>Share useful details about the guides, activities, organization, and overall experience.', 'warning')}
      ${emailButton('Write a review', reviewUrl)}
      ${emailParagraph('Your review will appear on the trip page after any required moderation.')}`
    return renderEmail({ title: 'Share your trip feedback', preheader: `Tell other travelers about ${tripTitle}.`, content })
  }

  async sendReviewRequest(travelerEmail: string, tripTitle: string, agencyName: string, reviewUrl: string) {
    await this.sendEmail(travelerEmail, `Ouiboo: Share your review — ${tripTitle}`, this.getReviewRequestTemplate(tripTitle, agencyName, reviewUrl))
  }

  getAutoUnpaidCancellationTemplate(tripTitle: string, bookingId: string) {
    const content = `
      ${emailHeading('Your booking was cancelled')}
      ${emailParagraph(`The booking for ${tripTitle} was automatically cancelled because payment was not completed within the required timeframe.`)}
      ${emailPanel(`Booking reference: ${emailStrong(bookingId)}<br>No payment proof was received before the deadline.`, 'danger')}
      ${emailParagraph('If seats remain available, you can create a new booking. Contact support if you believe this cancellation is incorrect.')}`
    return renderEmail({ title: 'Booking cancelled', preheader: `Your booking for ${tripTitle} was cancelled.`, content })
  }

  async sendAutoUnpaidCancellationNotice(travelerEmail: string, tripTitle: string, bookingId: string) {
    await this.sendEmail(travelerEmail, `Ouiboo: Booking cancelled — ${tripTitle}`, this.getAutoUnpaidCancellationTemplate(tripTitle, bookingId))
  }
}
