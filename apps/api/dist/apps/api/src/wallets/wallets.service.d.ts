import { DatabaseService } from '../database/database.service';
export declare class WalletsService {
    private db;
    constructor(db: DatabaseService);
    getWallet(agencyId: string): Promise<{
        transactions: {
            type: import("@ouiboo/database").$Enums.TransactionType;
            id: string;
            createdAt: Date;
            walletId: string;
            amount: number;
            reason: string;
        }[];
    } & {
        id: string;
        agencyId: string;
        availableBalance: number;
        pendingBalance: number;
    }>;
    creditWallet(agencyId: string, amount: number, reason: string): Promise<{
        id: string;
        agencyId: string;
        availableBalance: number;
        pendingBalance: number;
    }>;
    requestPayout(agencyId: string, amount: number, bankDetails: string): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        agencyId: string;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    }>;
}
