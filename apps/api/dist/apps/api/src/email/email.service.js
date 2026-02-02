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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map