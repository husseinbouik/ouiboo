
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { getBillingConfig } from '../common/billing-config';

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
            select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true, cancelAtPeriodEnd: true, subscriptionTier: true, grandfatheredUntil: true }
        });

        if (!agency) return false;

        // #698 (Council S6): billing configuration gates.
        // (a) Beta-cohort grandfathering: inside the grandfathered
        //     horizon the agency keeps full access regardless of the
        //     subscription status/expiry bookkeeping.
        // (b) The FREE tier is genuinely publishable: an agency on the
        //     FREE tier passes this guard (no paywall on publishing)
        //     while the config flag is on (default).
        const billingConfig = getBillingConfig();
        if (agency.grandfatheredUntil && agency.grandfatheredUntil > new Date()) {
            return true;
        }
        if (billingConfig.freeTierPublishable && (agency.subscriptionTier ?? 'FREE') === 'FREE') {
            return true;
        }

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
