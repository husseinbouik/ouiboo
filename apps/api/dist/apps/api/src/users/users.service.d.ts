import { DatabaseService } from '../database/database.service';
export declare class UsersService {
    private db;
    constructor(db: DatabaseService);
    findOne(id: string): Promise<{
        agencyProfile: {
            id: string;
            companyName: string;
            ice: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
            userId: string;
        };
    } & {
        email: string;
        password: string;
        name: string | null;
        role: import("@ouiboo/database").$Enums.UserRole;
        otp: string | null;
        id: string;
        avatar: string | null;
        isEmailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateAgencyProfile(userId: string, data: any): Promise<{
        id: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        userId: string;
    }>;
    getMe(userId: string): Promise<{
        agencyProfile: {
            id: string;
            companyName: string;
            ice: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
            userId: string;
        };
    } & {
        email: string;
        password: string;
        name: string | null;
        role: import("@ouiboo/database").$Enums.UserRole;
        otp: string | null;
        id: string;
        avatar: string | null;
        isEmailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
