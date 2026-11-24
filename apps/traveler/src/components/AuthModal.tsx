'use client';

import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { Button, Input, Logo, Dialog, DialogContent, DialogTitle, DialogDescription } from '@ouiboo/ui';
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

/**
 * Design Council Phase 2 — Auth A (REDESIGN): branded split panel on
 * the shared Radix Dialog from @ouiboo/ui (proper dialog semantics,
 * focus trap, Escape/backdrop dismissal and focus restoration come
 * from Radix — the previous hand-rolled modal had none of them). The
 * navy identity panel follows the admin-login model: logo, platform
 * headline and the money-story line a phishing clone cannot copy at
 * a glance.
 */
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

    return (
        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
            <DialogContent
                closeLabel={t('authModal.close')}
                className="max-w-2xl overflow-hidden rounded-3xl p-0 sm:rounded-3xl"
            >
                <div className="grid md:grid-cols-[42%_58%]">
                    {/* Platform identity panel (admin-login model). */}
                    <div className="hidden flex-col gap-4 bg-deep-blue p-8 text-white md:flex">
                        <Logo size={44} tone="on-dark" aria-label="Ouiboo" />
                        <p className="font-display text-2xl font-bold leading-snug">{t('authModal.brandHeadline')}</p>
                        <p className="text-sm leading-relaxed text-white/80">{t('authModal.brandBody')}</p>
                        <p className="mt-auto flex items-start gap-2 text-sm font-semibold text-sand">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sunset-orange" aria-hidden="true" />
                            {t('authModal.brandMoneyLine')}
                        </p>
                    </div>

                    <div className="p-8 md:p-10">
                        <div className="mb-8 text-center md:text-start">
                            <div className="mb-4 flex items-center justify-center md:hidden">
                                <Logo size={44} tone="auto" aria-label="Ouiboo" />
                            </div>
                            <DialogTitle className="text-2xl font-bold text-foreground">{t('authModal.title')}</DialogTitle>
                            <DialogDescription className="mt-2 text-sm font-medium text-muted-foreground">{t('authModal.subtitle')}</DialogDescription>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="auth-modal-email" className="ms-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('authModal.email')}</label>
                                    <div className="relative">
                                        <Mail className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="auth-modal-email"
                                            type="email"
                                            autoComplete="username"
                                            placeholder={t('authModal.emailPlaceholder')}
                                            className="h-12 rounded-xl border-border bg-muted/50 ps-11 transition-all focus:bg-background"
                                            {...register('email', { required: true })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="auth-modal-password" className="ms-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('authModal.password')}</label>
                                    <div className="relative">
                                        <Lock className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="auth-modal-password"
                                            type="password"
                                            autoComplete="current-password"
                                            placeholder={t('authModal.passwordPlaceholder')}
                                            className="h-12 rounded-xl border-border bg-muted/50 ps-11 transition-all focus:bg-background"
                                            {...register('password', { required: true })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loginMutation.isPending}
                                className="h-12 w-full rounded-xl bg-sunset-orange font-bold text-deep-blue shadow-lg shadow-sunset-orange/20 transition-all hover:bg-sunset-orange-dark hover:text-white"
                            >
                                {loginMutation.isPending ? t('authModal.submitting') : t('authModal.signIn')}
                            </Button>

                            <div className="space-y-4 text-center">
                                <div className="flex items-center gap-4 py-2">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('authModal.or')}</span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('authModal.noAccount')}{' '}
                                    <Link
                                        href="/signup"
                                        onClick={() => setShowLoginModal(false)}
                                        className="font-bold text-sunset-orange-dark hover:underline"
                                    >
                                        {t('authModal.signUp')}
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
