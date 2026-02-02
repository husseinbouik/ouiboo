'use client';
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    logout: () => void;
    refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading, refetch } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/users/me');
                return response.data;
            } catch (error) {
                return null;
            }
        },
        // Only fetch if we have a token
        enabled: typeof window !== 'undefined' && !!localStorage.getItem('token'),
    });

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
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
