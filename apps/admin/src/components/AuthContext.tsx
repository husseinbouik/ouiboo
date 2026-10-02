'use client';

import { createAuthContext } from '@ouiboo/auth';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

export const { AuthProvider, useAuth } = createAuthContext<AdminUser>({
    queryKey: ['admin-me'],
    navigation: 'replace',
});
