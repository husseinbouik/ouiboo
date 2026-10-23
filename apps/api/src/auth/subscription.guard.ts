
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
            where: { userId: user.userId },
            select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true, cancelAtPeriodEnd: true }
        });

        if (!agency) return false;

        if (agency.subscriptionStatus === 'ACTIVE') {
            const now = new Date();
            if (agency.subscriptionEndsAt && now > agency.subscriptionEndsAt) {
                if (agency.cancelAtPeriodEnd) {
                    throw new ForbiddenException({
                        message: 'SUBSCRIPTION_CANCELLED',
                        details: 'Your subscription was cancelled and has now ended.'
                    });
                }
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
                if (agency.cancelAtPeriodEnd) {
                    throw new ForbiddenException({
                        message: 'SUBSCRIPTION_CANCELLED',
                        details: 'Your subscription was cancelled and has now ended.'
                    });
                }
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
