"use client";

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area } from 'recharts';
import { Card, Button } from '@ouiboo/ui';
import { Download } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import { exportRevenueTrendsToCSV } from '../../lib/export-utils';

type Point = { date: string; amount: number };

export default function RevenueTrendChart({ data, period, rangeLabel }: { data?: Point[]; period: 'daily' | 'weekly' | 'monthly'; rangeLabel?: string }) {
  const { t, i18n } = useTranslation();
  const [mode] = useState(period);

  const formatted = useMemo(() => {
    if (!data) return undefined;
    return data.map((d) => ({
      ...d,
      label: formatLocalDate(d.date, i18n.language, mode === 'monthly' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' }),
    }));
  }, [data, mode, i18n.language]);

  if (!data) {
    return (
      <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
        <div className="animate-pulse h-64 bg-muted rounded-lg" />
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
        <div className="text-sm text-muted-foreground">{t('charts.revenue.noData')}</div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg text-foreground">{t('charts.revenue.title')}</h3>
          {rangeLabel && <p className="text-sm text-muted-foreground">{rangeLabel}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportRevenueTrendsToCSV(data, 'revenue-trends.csv')}>
            <Download className="ms-2 h-4 w-4 rtl:rotate-180" /> {t('charts.revenue.export')}
          </Button>
        </div>
      </div>

      <div style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatted}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatCurrency(v, undefined, i18n.language)} />
            <Tooltip formatter={(value: number) => formatCurrency(value, undefined, i18n.language)} labelFormatter={(l) => l} />
            <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#grad)" />
            <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
