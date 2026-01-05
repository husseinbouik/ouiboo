import { UsersService } from './users.service';
import { UpdateAgencyProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
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
    updateProfile(req: any, body: UpdateAgencyProfileDto): Promise<{
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
}
