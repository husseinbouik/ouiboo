
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(private db: DatabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'AGENCY') {
            return true; // Pass through if not agency (or handle elsewhere)
        }

        const agency = await this.db.agencyProfile.findUnique({
            where: { userId: user.id },
            select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true }
        });

        if (!agency) return false;

        if (agency.subscriptionStatus === 'ACTIVE') {
            const now = new Date();
            if (agency.subscriptionEndsAt && now > agency.subscriptionEndsAt) {
                throw new ForbiddenException({
                    message: 'SUBSCRIPTION_EXPIRED',
                    details: 'Your subscription has ended. Please renew to continue.'
                });
            }
            return true;
        }

        if (agency.subscriptionStatus === 'TRIAL') {
            const now = new Date();
            if (agency.trialEndsAt && now > agency.trialEndsAt) {
                throw new ForbiddenException({
                    message: 'TRIAL_EXPIRED',
                    details: 'Your free trial has expired. Please upgrade to continue.'
                });
            }
            return true;
        }

        throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    }
}
