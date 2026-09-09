'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { VerificationStatusType } from '@ouiboo/types';
import { clearBrowserAccessToken } from '@ouiboo/api-client';

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

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    logout: () => Promise<void>;
    refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { data: user, isLoading, refetch } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/users/me');
                return response.data;
            } catch {
                return null;
            }
        },
        retry: false,
    });

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } finally {
            clearBrowserAccessToken();
        }
        router.replace('/login');
        router.refresh();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, logout, refetch }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
