import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(EmailService.name);

    constructor() {
        // Initialize transporter with environment variables
        // If no credentials provided, it will log to console (useful for dev/zero-cost)
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587');
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && user && pass) {
            try {
                this.transporter = nodemailer.createTransport({
                    host,
                    port,
                    secure: port === 465,
                    auth: { user, pass },
                    // Add connection timeout and other options
                    connectionTimeout: 5000,
                    greetingTimeout: 5000,
                    socketTimeout: 5000,
                });
                this.logger.log(`EmailService initialized with SMTP (${host}:${port})`);
            } catch (error) {
                this.logger.error('Failed to initialize SMTP transporter:', error);
                this.transporter = undefined;
            }
        } else {
            const missing = [];
            if (!host) missing.push('SMTP_HOST');
            if (!user) missing.push('SMTP_USER');
            if (!pass) missing.push('SMTP_PASS');
            this.logger.warn(`EmailService: SMTP not configured. Missing: ${missing.join(', ')}`);
            this.logger.warn('Emails will be logged to console instead of being sent.');
            this.transporter = undefined;
        }
    }

    isConfigured(): boolean {
        return !!this.transporter;
    }

    async sendEmail(to: string, subject: string, html: string) {
        if (this.transporter) {
            try {
                const result = await this.transporter.sendMail({
                    from: `"OUIBOO" <${process.env.SMTP_USER}>`,
                    to,
                    subject,
                    html,
                });
                this.logger.log(`Email sent successfully to ${to}. MessageId: ${result.messageId}`);
                return result;
            } catch (error) {
                this.logger.error(`Failed to send email to ${to}`, error);
                // Re-throw the error so callers know email failed
                throw new Error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            // Log prominently when SMTP is not configured
            this.logger.warn(`[MOCK EMAIL - SMTP NOT CONFIGURED] To: ${to} | Subject: ${subject}`);
            this.logger.warn(`[MOCK EMAIL BODY] ${html}`);
            this.logger.warn(`To enable email sending, configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.`);
            // In development, we might want to allow this, but log it prominently
            // In production, you might want to throw an error instead
            // For now, we'll allow it but log prominently
        }
    }

    async sendMail(to: string, subject: string, html: string) {
        return this.sendEmail(to, subject, html);
    }

    getOTPTemplate(otp: string) {
        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F3F4F6; padding: 24px;">
                <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; background: linear-gradient(135deg,#0F172A,#1D4ED8); color: #ffffff; font-weight: 700; font-size: 18px; margin-bottom: 8px;">
                            O
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: #0F172A;">Ouiboo</div>
                    </div>

                    <h1 style="font-size: 22px; line-height: 1.3; font-weight: 700; color: #0F172A; margin: 0 0 12px;">
                        Verify your email address
                    </h1>
                    <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 20px;">
                        Use the verification code below to complete your signup and secure your account.
                    </p>

                    <div style="text-align: center; margin: 24px 0;">
                        <div style="display: inline-block; padding: 14px 26px; border-radius: 999px; background: #0F172A; color: #F9FAFB; letter-spacing: 0.4em; font-size: 22px; font-weight: 700;">
                            ${otp}
                        </div>
                    </div>

                    <p style="font-size: 13px; line-height: 1.6; color: #6B7280; margin: 0 0 8px;">
                        This code expires in <strong>10 minutes</strong>. If it expires, you can request a new code from the app.
                    </p>
                    <p style="font-size: 12px; line-height: 1.6; color: #9CA3AF; margin: 0;">
                        If you didn’t create an account on Ouiboo, you can safely ignore this email.
                    </p>

                    <div style="border-top: 1px solid #E5E7EB; margin-top: 24px; padding-top: 16px; text-align: center;">
                        <p style="font-size: 11px; color: #9CA3AF; margin: 0;">
                            © ${new Date().getFullYear()} Ouiboo. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getWelcomeTemplate(name?: string | null) {
        const safeName = name ? ` ${name}` : '';
        return `
            <h1>Welcome to Ouiboo${safeName}!</h1>
            <p>Your email is verified and your account is ready to go.</p>
            <p>Start exploring trips and managing bookings from your dashboard.</p>
        `;
    }

    async sendOTP(to: string, otp: string) {
        const html = this.getOTPTemplate(otp);
        await this.sendEmail(to, this.generateOTPSubject(), html);
    }

    generateOTPSubject() {
        return 'OUIBOO: Verify your email address';
    }

    async sendWelcomeEmail(to: string, name?: string | null) {
        const html = this.getWelcomeTemplate(name);
        await this.sendEmail(to, 'Welcome to OUIBOO!', html);
    }

    getPasswordResetTemplate(resetUrl: string) {
        return `
            <h1>Reset your password</h1>
            <p>We received a request to reset your Ouiboo password.</p>
            <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Click here to set a new password</a></p>
            <p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>
        `;
    }

    async sendPasswordResetEmail(to: string, resetUrl: string) {
        const html = this.getPasswordResetTemplate(resetUrl);
        await this.sendEmail(to, 'OUIBOO: Reset your password', html);
    }

    async sendBookingNotification(travelerEmail: string, agencyEmail: string, bookingId: string, tripTitle: string) {
        const travelerHtml = `
            <h1>Booking Received!</h1>
            <p>Your booking for <b>${tripTitle}</b> (ID: ${bookingId}) has been received successfully.</p>
            <p>Please upload your payment proof in the dashboard to confirm your seats.</p>
        `;
        const agencyHtml = `
            <h1>New Booking Alert</h1>
            <p>A new booking has been made for <b>${tripTitle}</b>.</p>
            <p>Traveler: ${travelerEmail}</p>
            <p>Go to your dashboard to review and verify payment.</p>
        `;

        await Promise.all([
            this.sendEmail(travelerEmail, `OUIBOO: Booking Received - ${tripTitle}`, travelerHtml),
            this.sendEmail(agencyEmail, `OUIBOO: New Booking Received!`, agencyHtml)
        ]);
    }

    async sendPaymentConfirmation(travelerEmail: string, tripTitle: string) {
        const html = `
            <h1>Payment Verified!</h1>
            <p>Great news! Your payment for <b>${tripTitle}</b> has been verified by the agency.</p>
            <p>Your seats are now officially confirmed. Get ready for your adventure!</p>
        `;
        await this.sendEmail(travelerEmail, `OUIBOO: Booking Confirmed - ${tripTitle}`, html);
    }

    getPaymentReminderTemplate(tripTitle: string, daysUntilPaymentDue: number, bookingDashboardUrl: string) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1E3A8A; margin-bottom: 20px;">Payment Reminder for ${tripTitle}</h2>
                <p style="font-size: 16px; color: #374151;">
                    Your payment is due in <strong>${daysUntilPaymentDue} hour${daysUntilPaymentDue === 1 ? '' : 's'}</strong>. 
                    Please complete your payment to confirm your booking.
                </p>
                <div style="margin: 30px 0; padding: 20px; background: #F3F4F6; border-left: 4px solid #F97316; border-radius: 4px;">
                    <p style="margin: 0; color: #374151;">
                        <strong>Why upload payment proof?</strong> It helps us confirm your booking quickly and ensures your seats are reserved for the trip.
                    </p>
                </div>
                <p style="text-align: center; margin-top: 30px;">
                    <a href="${bookingDashboardUrl}" 
                       style="background: #0EA5E9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Upload Payment Proof
                    </a>
                </p>
                <p style="font-size: 13px; color: #6B7280; text-align: center; margin-top: 20px;">
                    If you have already uploaded your payment proof, ignore this email. Your booking will be confirmed shortly.
                </p>
            </div>
        `;
    }

    async sendPaymentReminder(travelerEmail: string, tripTitle: string, daysUntilPaymentDue: number, bookingDashboardUrl: string) {
        const html = this.getPaymentReminderTemplate(tripTitle, daysUntilPaymentDue, bookingDashboardUrl);
        await this.sendEmail(travelerEmail, `⏰ OUIBOO: Payment Reminder - ${tripTitle}`, html);
    }

    getTripReminderTemplate(tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string) {
        const reminderType = daysUntilTrip === 7 ? 'one week' : 'one day';
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1E3A8A; margin-bottom: 20px;">🎉 Your Adventure Starts ${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)}!</h2>
                <p style="font-size: 16px; color: #374151;">
                    Get ready! Your trip <strong>${tripTitle}</strong> with <strong>${agencyName}</strong> 
                    starts in ${reminderType}. Pack your bags and prepare for an unforgettable experience!
                </p>
                <div style="margin: 30px 0;">
                    <h3 style="color: #1E3A8A; margin-bottom: 15px;">Last-minute checklist:</h3>
                    <ul style="color: #374151; line-height: 1.8;">
                        <li>✅ Confirm your travel documents are valid</li>
                        <li>✅ Check the weather forecast for your destination</li>
                        <li>✅ Review the itinerary and meeting points</li>
                        <li>✅ Pack essentials and comfortable clothing</li>
                        <li>✅ Save the agency contact number</li>
                    </ul>
                </div>
                <p style="text-align: center; margin-top: 30px;">
                    <a href="${tripDetailsUrl}" 
                       style="background: #F97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View Trip Details
                    </a>
                </p>
                <p style="font-size: 13px; color: #6B7280; text-align: center; margin-top: 20px;">
                    Have questions? Contact the agency directly through your Ouiboo dashboard.
                </p>
            </div>
        `;
    }

    async sendTripReminder(travelerEmail: string, tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string) {
        const html = this.getTripReminderTemplate(tripTitle, daysUntilTrip, agencyName, tripDetailsUrl);
        const reminderLabel = daysUntilTrip === 7 ? 'Week Before' : 'Day Before';
        await this.sendEmail(travelerEmail, `🎒 OUIBOO: ${reminderLabel} Your Trip - ${tripTitle}`, html);
    }

    getReviewRequestTemplate(tripTitle: string, agencyName: string, reviewUrl: string) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1E3A8A; margin-bottom: 20px;">How was your trip with ${agencyName}?</h2>
                <p style="font-size: 16px; color: #374151;">
                    We hope you had an amazing time on <strong>${tripTitle}</strong>! 
                    Your feedback helps other travelers find great agencies and helps agencies improve their services.
                </p>
                <div style="margin: 30px 0; padding: 20px; background: #FEF3C7; border-left: 4px solid #FBBF24; border-radius: 4px;">
                    <p style="margin: 0; color: #92400E;">
                        <strong>Share your experience:</strong> Tell us about the accommodations, guides, activities, and overall experience.
                    </p>
                </div>
                <p style="text-align: center; margin-top: 30px;">
                    <a href="${reviewUrl}" 
                       style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Write a Review
                    </a>
                </p>
                <p style="font-size: 13px; color: #6B7280; text-align: center; margin-top: 20px;">
                    Your review will be published on the trip page to help future travelers make informed decisions.
                </p>
            </div>
        `;
    }

    async sendReviewRequest(travelerEmail: string, tripTitle: string, agencyName: string, reviewUrl: string) {
        const html = this.getReviewRequestTemplate(tripTitle, agencyName, reviewUrl);
        await this.sendEmail(travelerEmail, `⭐ OUIBOO: Share Your Review - ${tripTitle}`, html);
    }

    getAutoUnpaidCancellationTemplate(tripTitle: string, bookingId: string) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #DC2626; margin-bottom: 20px;">⚠️ Your booking has been cancelled</h2>
                <p style="font-size: 16px; color: #374151;">
                    Your booking for <strong>${tripTitle}</strong> (ID: ${bookingId}) has been automatically cancelled 
                    because payment was not received within the required timeframe.
                </p>
                <div style="margin: 30px 0; padding: 20px; background: #FEE2E2; border-left: 4px solid #DC2626; border-radius: 4px;">
                    <p style="margin: 0; color: #991B1B;">
                        <strong>What happened?</strong> Payment reminders were sent, but no payment proof was uploaded.
                    </p>
                </div>
                <p style="font-size: 16px; color: #374151; margin-top: 20px;">
                    <strong>Want to rebook?</strong> This trip may still have available seats. Visit your dashboard to make a new booking.
                </p>
                <p style="font-size: 13px; color: #6B7280; text-align: center; margin-top: 30px;">
                    If you believe this was a mistake or have questions, please contact our support team.
                </p>
            </div>
        `;
    }

    async sendAutoUnpaidCancellationNotice(travelerEmail: string, tripTitle: string, bookingId: string) {
        const html = this.getAutoUnpaidCancellationTemplate(tripTitle, bookingId);
        await this.sendEmail(travelerEmail, `❌ OUIBOO: Booking Cancelled - ${tripTitle}`, html);
    }
}
