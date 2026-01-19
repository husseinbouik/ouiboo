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
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.logger.log('EmailService initialized with SMTP');
        } else {
            this.logger.warn('EmailService: No SMTP credentials found. Emails will be logged to console.');
        }
    }

    async sendEmail(to: string, subject: string, html: string) {
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"OUIBOO" <${process.env.SMTP_USER}>`,
                    to,
                    subject,
                    html,
                });
                this.logger.log(`Email sent to ${to}`);
            } catch (error) {
                this.logger.error(`Failed to send email to ${to}`, error);
            }
        } else {
            this.logger.debug(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
            // In a real zero-cost PROD env, we'd use a free tier like Resend or SendGrid.
            // For now, console logging suffices for "Proof of Logic".
        }
    }

    async sendMail(to: string, subject: string, html: string) {
        return this.sendEmail(to, subject, html);
    }

    getOTPTemplate(otp: string) {
        return `
            <h1>Verify your email</h1>
            <p>Use the verification code below to complete your signup:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
            <p>This code expires in 10 minutes.</p>
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
}
