'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Button, Input, Label } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';

type AgencyPromoCode = {
    id: string;
    code: string;
    discountType: 'PERCENT' | 'FIXED_MAD';
    discountValue: string;
    startsAt?: string | null;
    endsAt?: string | null;
    maxUses?: number | null;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
};

/**
 * #778 (Council S6 Phase 3): agency-funded promo codes. The agency
 * creates codes for its OWN bookings and funds 100% of the discount:
 * the traveller's trip price is reduced, and the deposit, balance and
 * refunds are computed on the discounted total. Deactivating a code
 * never changes bookings already made under it (their snapshot is
 * immutable).
 */
export default function AgencyPromoCodesPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED_MAD'>('PERCENT');
    const [discountValue, setDiscountValue] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [createError, setCreateError] = useState(false);

    const { data: codes = [], isLoading } = useQuery<AgencyPromoCode[]>({
        queryKey: ['agency-promo-codes'],
        queryFn: async () => {
            const response = await apiClient.get('/promo-codes');
            return response.data as AgencyPromoCode[];
        },
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agency-promo-codes'] });

    const createMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post('/promo-codes', {
                code: code.trim(),
                discountType,
                discountValue: Number(discountValue),
                ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
                ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
                ...(maxUses ? { maxUses: Number(maxUses) } : {}),
            });
        },
        onSuccess: async () => {
            setCreateError(false);
            setCode('');
            setDiscountValue('');
            setStartsAt('');
            setEndsAt('');
            setMaxUses('');
            await invalidate();
        },
        onError: () => setCreateError(true),
    });

    const activeMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            await apiClient.patch(`/promo-codes/${id}/active`, { isActive });
        },
        onSuccess: async () => { await invalidate(); },
    });

    const canCreate = code.trim().length > 0 && Number(discountValue) > 0 && !createMutation.isPending;
    const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.language);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black font-display">{t('promoCodes.title')}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('promoCodes.subtitle')}</p>
            </div>

            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="promo-code">{t('promoCodes.code')}</Label>
                            <Input
                                id="promo-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                maxLength={64}
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo-type">{t('promoCodes.type')}</Label>
                            <select
                                id="promo-type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED_MAD')}
                            >
                                <option value="PERCENT">{t('promoCodes.percent')}</option>
                                <option value="FIXED_MAD">{t('promoCodes.fixed')}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo-value">
                                {discountType === 'PERCENT' ? t('promoCodes.valuePercent') : t('promoCodes.valueFixed')}
                            </Label>
                            <Input
                                id="promo-value"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo-starts">{t('promoCodes.startsAt')}</Label>
                            <Input
                                id="promo-starts"
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo-ends">{t('promoCodes.endsAt')}</Label>
                            <Input
                                id="promo-ends"
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo-max">{t('promoCodes.maxUses')}</Label>
                            <Input
                                id="promo-max"
                                type="number"
                                min="1"
                                step="1"
                                value={maxUses}
                                onChange={(e) => setMaxUses(e.target.value)}
                            />
                        </div>
                    </div>
                    {createError && (
                        <p role="alert" className="text-sm font-semibold text-rose-600">{t('promoCodes.createError')}</p>
                    )}
                    <Button disabled={!canCreate} onClick={() => createMutation.mutate()}>
                        {createMutation.isPending ? t('promoCodes.creating') : t('promoCodes.create')}
                    </Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : codes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('promoCodes.noCodes')}</p>
            ) : (
                <div className="space-y-4">
                    {codes.map((promo) => (
                        <Card key={promo.id}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                                <div className="space-y-1">
                                    <p className="font-black tracking-wide">{promo.code}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {promo.discountType === 'PERCENT'
                                            ? `${Number(promo.discountValue)}%`
                                            : `${promo.discountValue} MAD`}
                                        {' · '}
                                        {t('promoCodes.uses')}: {promo.usedCount}
                                        {promo.maxUses != null ? ` / ${promo.maxUses}` : ` (${t('promoCodes.unlimited')})`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('promoCodes.window')}: {promo.startsAt || promo.endsAt ? (
                                            <>
                                                {promo.startsAt ? ` ${t('promoCodes.from', { date: formatDate(promo.startsAt) })}` : ''}
                                                {promo.endsAt ? ` ${t('promoCodes.until', { date: formatDate(promo.endsAt) })}` : ''}
                                            </>
                                        ) : t('promoCodes.always')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={promo.isActive ? 'text-sm font-bold text-emerald-600' : 'text-sm font-bold text-muted-foreground'}>
                                        {promo.isActive ? t('promoCodes.active') : t('promoCodes.inactive')}
                                    </span>
                                    <Button
                                        variant="outline"
                                        disabled={activeMutation.isPending}
                                        onClick={() => activeMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                                    >
                                        {promo.isActive ? t('promoCodes.deactivate') : t('promoCodes.activate')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
