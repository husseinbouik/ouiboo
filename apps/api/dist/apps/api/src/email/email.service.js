"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor() {
        this.logger = new common_1.Logger(EmailService_1.name);
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
        }
        else {
            this.logger.warn('EmailService: No SMTP credentials found. Emails will be logged to console.');
        }
    }
    async sendEmail(to, subject, html) {
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"OUIBOO" <${process.env.SMTP_USER}>`,
                    to,
                    subject,
                    html,
                });
                this.logger.log(`Email sent to ${to}`);
            }
            catch (error) {
                this.logger.error(`Failed to send email to ${to}`, error);
            }
        }
        else {
            this.logger.debug(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
            this.logger.debug(`[MOCK EMAIL BODY] ${html}`);
        }
    }
    async sendMail(to, subject, html) {
        return this.sendEmail(to, subject, html);
    }
    getOTPTemplate(otp) {
        return `
            <h1>Verify your email</h1>
            <p>Use the verification code below to complete your signup:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
            <p>This code expires in 10 minutes.</p>
        `;
    }
    getWelcomeTemplate(name) {
        const safeName = name ? ` ${name}` : '';
        return `
            <h1>Welcome to Ouiboo${safeName}!</h1>
            <p>Your email is verified and your account is ready to go.</p>
            <p>Start exploring trips and managing bookings from your dashboard.</p>
        `;
    }
    async sendOTP(to, otp) {
        const html = this.getOTPTemplate(otp);
        await this.sendEmail(to, this.generateOTPSubject(), html);
    }
    generateOTPSubject() {
        return 'OUIBOO: Verify your email address';
    }
    async sendWelcomeEmail(to, name) {
        const html = this.getWelcomeTemplate(name);
        await this.sendEmail(to, 'Welcome to OUIBOO!', html);
    }
    getPasswordResetTemplate(resetUrl) {
        return `
            <h1>Reset your password</h1>
            <p>We received a request to reset your Ouiboo password.</p>
            <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Click here to set a new password</a></p>
            <p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>
        `;
    }
    async sendPasswordResetEmail(to, resetUrl) {
        const html = this.getPasswordResetTemplate(resetUrl);
        await this.sendEmail(to, 'OUIBOO: Reset your password', html);
    }
    async sendBookingNotification(travelerEmail, agencyEmail, bookingId, tripTitle) {
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
    async sendPaymentConfirmation(travelerEmail, tripTitle) {
        const html = `
            <h1>Payment Verified!</h1>
            <p>Great news! Your payment for <b>${tripTitle}</b> has been verified by the agency.</p>
            <p>Your seats are now officially confirmed. Get ready for your adventure!</p>
        `;
        await this.sendEmail(travelerEmail, `OUIBOO: Booking Confirmed - ${tripTitle}`, html);
    }
    getPaymentReminderTemplate(tripTitle, daysUntilPaymentDue, bookingDashboardUrl) {
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
    async sendPaymentReminder(travelerEmail, tripTitle, daysUntilPaymentDue, bookingDashboardUrl) {
        const html = this.getPaymentReminderTemplate(tripTitle, daysUntilPaymentDue, bookingDashboardUrl);
        await this.sendEmail(travelerEmail, `⏰ OUIBOO: Payment Reminder - ${tripTitle}`, html);
    }
    getTripReminderTemplate(tripTitle, daysUntilTrip, agencyName, tripDetailsUrl) {
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
    async sendTripReminder(travelerEmail, tripTitle, daysUntilTrip, agencyName, tripDetailsUrl) {
        const html = this.getTripReminderTemplate(tripTitle, daysUntilTrip, agencyName, tripDetailsUrl);
        const reminderLabel = daysUntilTrip === 7 ? 'Week Before' : 'Day Before';
        await this.sendEmail(travelerEmail, `🎒 OUIBOO: ${reminderLabel} Your Trip - ${tripTitle}`, html);
    }
    getReviewRequestTemplate(tripTitle, agencyName, reviewUrl) {
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
    async sendReviewRequest(travelerEmail, tripTitle, agencyName, reviewUrl) {
        const html = this.getReviewRequestTemplate(tripTitle, agencyName, reviewUrl);
        await this.sendEmail(travelerEmail, `⭐ OUIBOO: Share Your Review - ${tripTitle}`, html);
    }
    getAutoUnpaidCancellationTemplate(tripTitle, bookingId) {
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
    async sendAutoUnpaidCancellationNotice(travelerEmail, tripTitle, bookingId) {
        const html = this.getAutoUnpaidCancellationTemplate(tripTitle, bookingId);
        await this.sendEmail(travelerEmail, `❌ OUIBOO: Booking Cancelled - ${tripTitle}`, html);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map