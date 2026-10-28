'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { clearBrowserAccessToken, createBrowserApiClient, hasPossibleBrowserSession } from '@ouiboo/api-client';

const defaultApiClient = createBrowserApiClient(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
);

export interface AuthBaseUser {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

export interface AuthContextValue<TUser extends AuthBaseUser> {
    user: TUser | null;
    isLoading: boolean;
    logout: () => Promise<void>;
    refetch: () => void;
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;
}

export interface AuthContextOptions<TUser extends AuthBaseUser> {
    queryKey: readonly unknown[];
    apiClient?: AxiosInstance;
    loginPath?: string;
    navigation?: 'push' | 'replace';
}

export function createAuthContext<TUser extends AuthBaseUser>(options: AuthContextOptions<TUser>) {
    const {
        queryKey,
        apiClient = defaultApiClient,
        loginPath = '/login',
        navigation = 'push',
    } = options;

    const AuthContext = createContext<AuthContextValue<TUser> | undefined>(undefined);

    function AuthProvider({ children }: { children: React.ReactNode }) {
        const router = useRouter();
        const { data: user, isLoading, refetch } = useQuery({
            queryKey,
            queryFn: async (): Promise<TUser | null> => {
                // #245: don't probe /users/me when no session can exist
                // (no in-memory token, no persisted session hint). The
                // unconditional probe 401'd for every anonymous visitor,
                // and the api-client's refresh-on-401 added a second 401
                // — console noise on every page of every portal, masking
                // real errors (it hid next to a real hydration error in
                // the production smoke run). Returning users keep the
                // restore path: the hint survives reloads, so the probe
                // fires and a stale token is refreshed + retried by the
                // api-client interceptor.
                if (!hasPossibleBrowserSession()) {
                    return null;
                }
                try {
                    const response = await apiClient.get('/users/me');
                    return response.data as TUser;
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
            if (navigation === 'replace') {
                router.replace(loginPath);
                router.refresh();
            } else {
                router.push(loginPath);
                await refetch();
            }
        };

        return (
            <AuthContext.Provider value={{ user: user ?? null, isLoading, logout, refetch, showLoginModal, setShowLoginModal }}>
                {children}
            </AuthContext.Provider>
        );
    }

    function useAuth() {
        const context = useContext(AuthContext);
        if (context === undefined) {
            throw new Error('useAuth must be used within an AuthProvider');
        }
        return context;
    }

    return { AuthProvider, useAuth };
}