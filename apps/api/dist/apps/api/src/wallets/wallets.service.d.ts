import { DatabaseService } from '../database/database.service';
export declare class WalletsService {
    private db;
    constructor(db: DatabaseService);
    getWallet(agencyId: string): Promise<{
        transactions: {
            type: import("@ouiboo/database").$Enums.TransactionType;
            id: string;
            createdAt: Date;
            amount: number;
            walletId: string;
            reason: string;
        }[];
    } & {
        id: string;
        availableBalance: number;
        pendingBalance: number;
        agencyId: string;
    }>;
    creditWallet(agencyId: string, amount: number, reason: string): Promise<{
        id: string;
        availableBalance: number;
        pendingBalance: number;
        agencyId: string;
    }>;
    requestPayout(agencyId: string, amount: number, bankDetails: string): Promise<{
        id: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    }>;
}
