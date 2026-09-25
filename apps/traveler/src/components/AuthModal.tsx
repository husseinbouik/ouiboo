'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock } from 'lucide-react';
import { Button, Input } from '@ouiboo/ui';
import { useAuth } from './AuthContext';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { setBrowserAccessToken } from '@ouiboo/api-client';

type AuthModalFormValues = {
    email: string;
    password: string;
};

type LoginResponse = {
    accessToken: string;
};

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

export function AuthModal() {
    const { t } = useTranslation();
    const { showLoginModal, setShowLoginModal, refetch } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset } = useForm<AuthModalFormValues>();

    const loginMutation = useMutation({
        mutationFn: async (data: AuthModalFormValues) => {
            const response = await apiClient.post('/auth/login', data);
            return response.data as LoginResponse;
        },
        onSuccess: async (data) => {
            setBrowserAccessToken(data.accessToken);
            await refetch();
            setShowLoginModal(false);
            reset();
            setError(null);
        },
        onError: (err: ApiError) => {
            setError(err?.response?.data?.message || t('authModal.error'));
        },
    });

    const onSubmit = (data: AuthModalFormValues) => {
        loginMutation.mutate(data);
    };

    if (!showLoginModal) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowLoginModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md bg-card rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-border overflow-hidden"
                >
                    <button 
                        onClick={() => setShowLoginModal(false)}
                        aria-label={t('authModal.close')}
                        className="absolute top-6 end-6 p-2 rounded-full hover:bg-muted transition-colors z-10"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>

                    <div className="p-8 md:p-10">
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                                O
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{t('authModal.title')}</h2>
                            <p className="text-sm text-muted-foreground mt-2 font-medium">{t('authModal.subtitle')}</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ms-1">{t('authModal.email')}</label>
                                    <div className="relative">
                                        <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder={t('authModal.emailPlaceholder')}
                                            className="ps-11 h-12 bg-muted/50 border-border rounded-xl focus:bg-background transition-all"
                                            {...register('email', { required: true })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ms-1">{t('authModal.password')}</label>
                                    <div className="relative">
                                        <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            type="password"
                                            placeholder={t('authModal.passwordPlaceholder')}
                                            className="ps-11 h-12 bg-muted/50 border-border rounded-xl focus:bg-background transition-all"
                                            {...register('password', { required: true })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-danger/10 text-danger text-xs font-bold rounded-xl border border-danger/20">
                                    {error}
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                disabled={loginMutation.isPending}
                                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-[0.98]"
                            >
                                {loginMutation.isPending ? t('authModal.submitting') : t('authModal.signIn')}
                            </Button>

                            <div className="text-center space-y-4">
                                <div className="flex items-center gap-4 py-2">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('authModal.or')}</span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('authModal.noAccount')}{' '}
                                    <Link
                                        href="/signup"
                                        onClick={() => setShowLoginModal(false)}
                                        className="text-accent font-bold hover:underline"
                                    >
                                        {t('authModal.signUp')}
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

