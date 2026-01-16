import { DatabaseService } from '../database/database.service';
export declare class AgencyPublicController {
    private readonly prisma;
    constructor(prisma: DatabaseService);
    getPublicProfile(id: string): Promise<{
        id: string;
        companyName: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string;
        logo: string;
    }>;
}
