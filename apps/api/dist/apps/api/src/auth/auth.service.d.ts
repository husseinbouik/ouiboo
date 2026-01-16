import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/auth.dto';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private db;
    private jwtService;
    private emailService;
    constructor(db: DatabaseService, jwtService: JwtService, emailService: EmailService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
        };
    }>;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
        };
    }>;
    verifyEmail(email: string, otp: string): Promise<{
        message: string;
    }>;
    resendOTP(email: string): Promise<{
        message: string;
    }>;
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: import("@ouiboo/database").$Enums.UserRole;
        };
    }>;
    logout(token?: string): Promise<{
        message: string;
    }>;
    private hashToken;
    private issueRefreshToken;
}
