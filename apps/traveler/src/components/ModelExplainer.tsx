'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

/**
 * #678 (Council S6): the plain-language model explainer + general FAQ.
 *
 * One component, reused where the traveller decides: the traveller help
 * page and checkout (the landing page renders the same copy from its own
 * locale namespace). Model filter: Ouiboo is the technology only — the
 * agency sells the trip, the traveller pays the agency directly, Ouiboo
 * never holds traveller money, and the agency is the refund obligor.
 */
export const MODEL_EXPLAINER_ITEM_IDS = [
    'whoSells',
    'payDirect',
    'stagedPayments',
    'refunds',
    'verification',
] as const;

export function ModelExplainer({
    compact = false,
    className = '',
}: {
    compact?: boolean;
    className?: string;
}) {
    const { t } = useTranslation();
    return (
        <section
            data-testid="model-explainer"
            aria-label={t('modelExplainer.title')}
            className={cn('space-y-4', className)}
        >
            <div className="space-y-2">
                <h2 className={compact ? 'text-lg font-bold text-foreground' : 'text-2xl font-bold text-foreground'}>
                    {t('modelExplainer.title')}
                </h2>
                <p className="text-muted-foreground">{t('modelExplainer.intro')}</p>
            </div>
            <div className={cn('grid gap-4', compact ? '' : 'sm:grid-cols-2')}>
                {MODEL_EXPLAINER_ITEM_IDS.map((id) => (
                    <div key={id} className="rounded-2xl border border-border bg-muted p-5">
                        <h3 className="font-semibold text-foreground">
                            {t(`modelExplainer.items.${id}.question`)}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t(`modelExplainer.items.${id}.answer`)}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
