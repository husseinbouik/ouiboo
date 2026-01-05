import { UserRole } from '@ouiboo/types';
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    email: string;
    password: string;
    name: string;
    role: UserRole;
}
export declare class RefreshTokenDto {
    refresh_token: string;
}
export declare class VerifyEmailDto {
    email: string;
    otp: string;
}
export declare class ResendOtpDto {
    email: string;
}
