"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@ouiboo/ui';
import { Users, UserCheck, TrendingUp } from 'lucide-react';

export default function CustomerDemographicsCard({ data = { totalCustomers: 0, repeatCustomers: 0, repeatCustomerRate: 0 } }: { data?: { totalCustomers: number; repeatCustomers: number; repeatCustomerRate: number } }) {
  const { t, i18n } = useTranslation();
  const rate = data.repeatCustomerRate || 0;
  const rateClass = rate > 30 ? 'bg-success text-success-foreground' : rate >= 15 ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground';

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg text-foreground">{t('charts.customers.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('charts.customers.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-start">
          <Users className="h-6 w-6 text-muted-foreground mb-2" />
          <div className="font-black text-2xl text-foreground">{data.totalCustomers.toLocaleString(i18n.language)}</div>
          <div className="text-sm text-muted-foreground">{t('charts.customers.total')}</div>
        </div>

        <div className="flex flex-col items-start">
          <UserCheck className="h-6 w-6 text-muted-foreground mb-2" />
          <div className="font-black text-2xl text-foreground">{data.repeatCustomers.toLocaleString(i18n.language)}</div>
          <div className="text-sm text-muted-foreground">{t('charts.customers.repeat')}</div>
        </div>

        <div className="flex flex-col items-start">
          <TrendingUp className="h-6 w-6 text-muted-foreground mb-2" />
          <div className={`font-black text-2xl px-3 py-1 rounded-lg ${rateClass}`}>{rate}%</div>
          <div className="text-sm text-muted-foreground">{t('charts.customers.repeatRate')}</div>
        </div>
      </div>
    </Card>
  );
}
