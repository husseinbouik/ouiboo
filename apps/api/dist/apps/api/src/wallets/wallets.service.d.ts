import { DatabaseService } from '../database/database.service';
export declare class WalletsService {
    private db;
    constructor(db: DatabaseService);
    getWallet(tenantId: string): Promise<{
        transactions: {
            type: import("@ouiboo/database").$Enums.TransactionType;
            id: string;
            createdAt: Date;
            walletId: string;
            amount: number;
            reason: string;
            referenceId: string | null;
        }[];
    } & {
        id: string;
        availableBalance: number;
        pendingBalance: number;
        agencyId: string;
    }>;
    creditWallet(tenantId: string, amount: number, reason: string): Promise<{
        id: string;
        availableBalance: number;
        pendingBalance: number;
        agencyId: string;
    }>;
    requestPayout(tenantId: string, amount: number, bankDetails: string): Promise<{
        id: string;
        bankDetails: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
    }>;
}
