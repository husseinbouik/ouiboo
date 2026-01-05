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
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_EMAIL,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    }
    async sendMail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: `"Ouiboo" <${process.env.GMAIL_EMAIL}>`,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent: ${info.messageId}`);
            return info;
        }
        catch (error) {
            this.logger.error('Error sending email:', error);
            return null;
        }
    }
    getWelcomeTemplate(name) {
        return `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #002B5B;">Welcome to Ouiboo, ${name}!</h2>
                <p>We're thrilled to have you join our marketplace. You're now part of a community dedicated to unique travel experiences.</p>
                <div style="background-color: #F9F9F9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold;">What's next?</p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>Complete your profile</li>
                        <li>Explore available trips</li>
                        <li>Start booking your next adventure!</li>
                    </ul>
                </div>
                <p>If you have any questions, just reply to this email.</p>
                <p>Happy travels,<br>The Ouiboo Team</p>
            </div>
        `;
    }
    getOTPTemplate(otp) {
        return `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 16px; text-align: center;">
                <h1 style="color: #002B5B; margin-bottom: 24px;">Verify your email</h1>
                <p style="color: #666; font-size: 16px; line-height: 24px;">Use the following 6-digit code to complete your registration:</p>
                <div style="background-color: #F8FAFC; border: 2px solid #E2E8F0; padding: 20px; border-radius: 12px; margin: 32px 0; display: inline-block;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FF5A1F;">${otp}</span>
                </div>
                <p style="color: #999; font-size: 14px;">This code will expire in 10 minutes.</p>
                <p style="color: #999; font-size: 14px; margin-top: 32px;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
        `;
    }
    getBookingConfirmationTemplate(userName, tripTitle, date) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Booking Confirmed!</h1>
                <p>Hello ${userName},</p>
                <p>Your booking for <strong>${tripTitle}</strong> on ${date} has been confirmed.</p>
                <p>We wish you a pleasant journey!</p>
                <br/>
                <p>Best regards,</p>
                <p>The Ouiboo Team</p>
            </div>
        `;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map