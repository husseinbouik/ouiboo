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
    };
}

export const { AuthProvider, useAuth } = createAuthContext<User>({
    queryKey: ['me'],
    navigation: 'replace',
});
