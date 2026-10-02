import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type AuditLogPayload = {
    actorId?: string;
    actorEmail?: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, any> | null;
};

@Injectable()
export class AuditLogService {
    constructor(private db: DatabaseService) { }

    async log(payload: AuditLogPayload) {
        return this.db.auditLog.create({
            data: {
                actorId: payload.actorId,
                actorEmail: payload.actorEmail,
                action: payload.action,
                targetType: payload.targetType,
                targetId: payload.targetId,
                metadata: payload.metadata ?? undefined,
            },
        });
    }
}
