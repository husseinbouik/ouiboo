'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Button, Input, Label } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';

type AgencyPriceRule = {
    id: string;
    templateId?: string | null;
    sessionId?: string | null;
    name: string;
    discountType: 'PERCENT' | 'FIXED_MAD';
    discountValue: string;
    startsAt?: string | null;
    endsAt?: string | null;
    maxUses?: number | null;
    usedCount: number;
    budgetCap?: string | null;
    discountGranted: string;
    stacksWithPromoCode: boolean;
    isActive: boolean;
    createdAt: string;
};

type AgencyTripOption = { id: string; title: string };

/**
 * #755: campaign/session pricing. The agency defines price rules that
 * apply AUTOMATICALLY to a trip's bookings (no code for the traveller
 * to enter) and funds 100% of the discount. Window, usage cap and an
 * optional budget cap bound the campaign; a rule combines with a promo
 * code only when the agency opts in. Deactivating a rule never changes
 * bookings already made under it (their snapshot is immutable).
 */
export default function AgencyPriceRulesPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED_MAD'>('PERCENT');
    const [discountValue, setDiscountValue] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [budgetCap, setBudgetCap] = useState('');
    const [stacks, setStacks] = useState(false);
    const [createError, setCreateError] = useState(false);

    const { data: rules = [], isLoading } = useQuery<AgencyPriceRule[]>({
        queryKey: ['agency-price-rules'],
        queryFn: async () => {
            const response = await apiClient.get('/price-rules');
            return response.data as AgencyPriceRule[];
        },
    });

    const { data: trips = [] } = useQuery<AgencyTripOption[]>({
        queryKey: ['agency-price-rule-trips'],
        queryFn: async () => {
            const response = await apiClient.get('/agency/trips');
            const rows = (response.data?.data ?? response.data ?? []) as Array<{ id: string; title: string }>;
            return rows.map((row) => ({ id: row.id, title: row.title }));
        },
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agency-price-rules'] });

    const createMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post('/price-rules', {
                name: name.trim(),
                templateId,
                discountType,
                discountValue: Number(discountValue),
                ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
                ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
                ...(maxUses ? { maxUses: Number(maxUses) } : {}),
                ...(budgetCap ? { budgetCap: Number(budgetCap) } : {}),
                stacksWithPromoCode: stacks,
            });
        },
        onSuccess: async () => {
            setCreateError(false);
            setName('');
            setTemplateId('');
            setDiscountValue('');
            setStartsAt('');
            setEndsAt('');
            setMaxUses('');
            setBudgetCap('');
            setStacks(false);
            await invalidate();
        },
        onError: () => setCreateError(true),
    });

    const activeMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            await apiClient.patch(`/price-rules/${id}/active`, { isActive });
        },
        onSuccess: async () => { await invalidate(); },
    });

    const canCreate = name.trim().length > 0 && templateId.length > 0 && Number(discountValue) > 0 && !createMutation.isPending;
    const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.language);
    const tripTitle = (id?: string | null) => trips.find((trip) => trip.id === id)?.title ?? id ?? '';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black font-display">{t('priceRules.title')}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('priceRules.subtitle')}</p>
            </div>

            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="rule-name">{t('priceRules.name')}</Label>
                            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-trip">{t('priceRules.trip')}</Label>
                            <select
                                id="rule-trip"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={templateId}
                                onChange={(e) => setTemplateId(e.target.value)}
                            >
                                <option value="">{t('priceRules.chooseTrip')}</option>
                                {trips.map((trip) => (
                                    <option key={trip.id} value={trip.id}>{trip.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-type">{t('priceRules.type')}</Label>
                            <select
                                id="rule-type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED_MAD')}
                            >
                                <option value="PERCENT">{t('priceRules.percent')}</option>
                                <option value="FIXED_MAD">{t('priceRules.fixed')}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-value">{discountType === 'PERCENT' ? t('priceRules.valuePercent') : t('priceRules.valueFixed')}</Label>
                            <Input id="rule-value" type="number" min="0.01" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-starts">{t('priceRules.startsAt')}</Label>
                            <Input id="rule-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-ends">{t('priceRules.endsAt')}</Label>
                            <Input id="rule-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-max">{t('priceRules.maxUses')}</Label>
                            <Input id="rule-max" type="number" min="1" step="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule-budget">{t('priceRules.budgetCap')}</Label>
                            <Input id="rule-budget" type="number" min="0.01" step="0.01" value={budgetCap} onChange={(e) => setBudgetCap(e.target.value)} />
                        </div>
                        <div className="flex items-end gap-2 pb-2">
                            <input id="rule-stacks" type="checkbox" checked={stacks} onChange={(e) => setStacks(e.target.checked)} />
                            <Label htmlFor="rule-stacks">{t('priceRules.stacks')}</Label>
                        </div>
                    </div>
                    {createError && (
                        <p role="alert" className="text-sm font-semibold text-rose-600">{t('priceRules.createError')}</p>
                    )}
                    <Button disabled={!canCreate} onClick={() => createMutation.mutate()}>
                        {createMutation.isPending ? t('priceRules.creating') : t('priceRules.create')}
                    </Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : rules.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('priceRules.noRules')}</p>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule) => (
                        <Card key={rule.id}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                                <div className="space-y-1">
                                    <p className="font-black tracking-wide">{rule.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {rule.sessionId ? t('priceRules.sessionScope') : tripTitle(rule.templateId)}
                                        {' · '}
                                        {rule.discountType === 'PERCENT' ? `${Number(rule.discountValue)}%` : `${rule.discountValue} MAD`}
                                        {' · '}
                                        {t('priceRules.uses')}: {rule.usedCount}
                                        {rule.maxUses != null ? ` / ${rule.maxUses}` : ` (${t('priceRules.unlimited')})`}
                                        {rule.budgetCap != null ? ` · ${t('priceRules.budget')}: ${rule.discountGranted} / ${rule.budgetCap} MAD` : ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('priceRules.window')}: {rule.startsAt || rule.endsAt ? (
                                            <>
                                                {rule.startsAt ? ` ${t('priceRules.from', { date: formatDate(rule.startsAt) })}` : ''}
                                                {rule.endsAt ? ` ${t('priceRules.until', { date: formatDate(rule.endsAt) })}` : ''}
                                            </>
                                        ) : t('priceRules.always')}
                                        {' · '}
                                        {rule.stacksWithPromoCode ? t('priceRules.stacksYes') : t('priceRules.stacksNo')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={rule.isActive ? 'text-sm font-bold text-emerald-600' : 'text-sm font-bold text-muted-foreground'}>
                                        {rule.isActive ? t('priceRules.active') : t('priceRules.inactive')}
                                    </span>
                                    <Button variant="outline" disabled={activeMutation.isPending} onClick={() => activeMutation.mutate({ id: rule.id, isActive: !rule.isActive })}>
                                        {rule.isActive ? t('priceRules.deactivate') : t('priceRules.activate')}
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
