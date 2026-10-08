'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Button, Badge } from '@ouiboo/ui';
import { Wallet as WalletIcon, ArrowUpRight, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@ouiboo/utils';

type WalletBalanceCardsProps = {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  revenue: number;
  totalBookings: number;
  language: string;
  onRequestPayout: () => void;
};

export function WalletBalanceCards({
  availableBalance,
  pendingBalance,
  currency,
  revenue,
  totalBookings,
  language,
  onRequestPayout,
}: WalletBalanceCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Available Balance */}
      <Card className="border-none shadow-lg bg-primary text-primary-foreground relative overflow-hidden">
        <CardContent className="p-8 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="bg-primary-foreground/10 p-2 rounded-lg text-primary-foreground">
              <WalletIcon className="h-6 w-6" />
            </div>
            <Badge variant="success" className="bg-success/20 border-success/30 font-bold uppercase text-[10px]">{t('wallet.paidBadge')}</Badge>
          </div>
          <div>
            <p className="text-primary-foreground/80 text-xs font-bold uppercase tracking-wider">{t('wallet.availableBalance')}</p>
            <h2 className="text-4xl font-black mt-1">
              {formatCurrency(availableBalance, currency, language)}
            </h2>
          </div>
          <Button
            onClick={onRequestPayout}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-lg shadow-accent/20 font-bold py-6 group transition-all"
          >
            {t('wallet.requestAction')} <ArrowUpRight className="ms-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform rtl:group-hover:-translate-x-1" />
          </Button>
        </CardContent>
        <div className="absolute -bottom-12 -end-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
      </Card>

      {/* Pending Balance */}
      <Card className="border-none shadow-sm bg-card border border-border">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-warning/10 p-2 rounded-lg text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 uppercase text-[10px] font-bold">{t('wallet.escrowBadge')}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{t('wallet.pendingBalance')}</p>
            <h2 className="text-4xl font-black text-foreground mt-1">
              {formatCurrency(pendingBalance, currency, language)}
            </h2>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic border-t border-border pt-4 font-medium">{t('wallet.escrowHint')}</p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="border-none shadow-sm bg-card border border-border">
        <CardContent className="p-8 space-y-6 text-foreground">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground">{t('wallet.growthTitle')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('wallet.totalRevenue')}</span>
              <span className="font-bold text-foreground">{formatCurrency(revenue, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('wallet.avgClearing')}</span>
              <span className="font-bold text-success">{t('wallet.avgClearingValue')}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-2">
              <span className="text-xs font-bold text-muted-foreground">{t('wallet.totalBookings')}</span>
              <span className="font-bold text-foreground">{totalBookings}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
