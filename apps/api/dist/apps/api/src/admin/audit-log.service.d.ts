import { DatabaseService } from '../database/database.service';
type AuditLogPayload = {
    actorId?: string;
    actorEmail?: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, any> | null;
};
export declare class AuditLogService {
    private db;
    constructor(db: DatabaseService);
    log(payload: AuditLogPayload): Promise<{
        id: string;
        createdAt: Date;
        actorId: string | null;
        actorEmail: string | null;
        action: string;
        targetType: string;
        targetId: string | null;
        metadata: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
    }>;
}
export {};
