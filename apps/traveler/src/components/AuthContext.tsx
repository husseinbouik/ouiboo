'use client';

import React, { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { clearBrowserAccessToken } from '@ouiboo/api-client';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    displayCurrency?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    logout: () => Promise<void>;
    refetch: () => void;
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { data: user, isLoading, refetch } = useQuery({
        queryKey: ['me-traveler'],
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

    const [showLoginModal, setShowLoginModal] = useState(false);

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } finally {
            clearBrowserAccessToken();
        }
        router.push('/login');
        await refetch();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, logout, refetch, showLoginModal, setShowLoginModal }}>
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

