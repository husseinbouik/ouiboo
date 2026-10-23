'use client';

import { createAuthContext } from '@ouiboo/auth';
import type { VerificationStatusType } from '@ouiboo/types';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    agencyProfile?: {
        id: string;
        companyName: string;
        ice?: string;
        patente?: string;
        rib?: string;
        bankDetails?: string;
        verificationStatus: VerificationStatusType;
        bio?: string;
        logo?: string;
        subscriptionStatus?: string;
        trialEndsAt?: string;
        subscriptionEndsAt?: string;
        subscriptionTermsVersion?: string;
        cancelAtPeriodEnd?: boolean;
        cancellationRequestedAt?: string;
        // #371: legal identity + Law 11-16 travel licence
        legalName?: string;
        rc?: string;
        taxId?: string;
        legalRepresentative?: string;
        businessAddress?: string;
        travelLicenceType?: string;
        travelLicenceNumber?: string;
        travelLicenceStatus?: string;
        licenceVerifiedAt?: string;
        licenceExpiry?: string;
        licenceRejectionReason?: string;
    };
}

export const { AuthProvider, useAuth } = createAuthContext<User>({
    queryKey: ['me'],
    navigation: 'replace',
});
