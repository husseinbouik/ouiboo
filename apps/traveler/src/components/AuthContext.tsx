'use client';

import { createAuthContext } from '@ouiboo/auth';
import type { AuthUser } from '@ouiboo/types';

/** #1025 (A4): traveller session user = shared AuthUser + display currency. */
interface User extends AuthUser {
    displayCurrency?: string;
}

export const { AuthProvider, useAuth } = createAuthContext<User>({
    queryKey: ['me-traveler'],
    navigation: 'push',
});
