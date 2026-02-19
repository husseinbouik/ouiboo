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
        metadata: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
        actorId: string | null;
        actorEmail: string | null;
        action: string;
        targetType: string;
        targetId: string | null;
    }>;
}
export {};
