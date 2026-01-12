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
