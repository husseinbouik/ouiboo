import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private db: DatabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;

        if (!user || user.role !== UserRole.Agency) {
            return true;
        }

        if (user.tenantId) {
            req.tenantId = user.tenantId;
            return true;
        }

        if (!user.userId) {
            throw new UnauthorizedException('Missing user identifier');
        }

        const agencyProfile = await this.db.agencyProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!agencyProfile) {
            throw new UnauthorizedException('Agency profile not found');
        }

        req.tenantId = agencyProfile.id;
        return true;
    }
}
