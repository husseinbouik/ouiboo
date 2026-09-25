'use client';

import { createAuthContext } from '@ouiboo/auth';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    displayCurrency?: string;
}

export const { AuthProvider, useAuth } = createAuthContext<User>({
    queryKey: ['me-traveler'],
    navigation: 'push',
});
