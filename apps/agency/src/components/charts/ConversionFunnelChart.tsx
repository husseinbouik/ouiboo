"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card, Badge, Button } from '@ouiboo/ui';
import { Download } from 'lucide-react';
import { exportConversionFunnelToCSV } from '../../lib/export-utils';

type FunnelProps = {
  data?: { views: number; bookingAttempts: number; confirmed: number; completed: number; conversionRate: number };
};

export default function ConversionFunnelChart({ data }: FunnelProps) {
  const { t } = useTranslation();

  const transformed = useMemo(() => {
    if (!data) return undefined;
    return [
      { stage: t('charts.funnel.stageViews'), count: data.views },
      { stage: t('charts.funnel.stageAttempts'), count: data.bookingAttempts },
      { stage: t('charts.funnel.stageConfirmed'), count: data.confirmed },
      { stage: t('charts.funnel.stageCompleted'), count: data.completed },
    ];
  }, [data, t]);

  if (!data) return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="animate-pulse h-64 bg-muted rounded-lg" />
    </Card>
  );

  if (data && !transformed?.length) return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6 text-muted-foreground">{t('charts.funnel.noData')}</Card>
  );

  const rate = data.conversionRate || 0;
  const badgeColor = rate > 5 ? 'bg-success' : rate >= 2 ? 'bg-warning' : 'bg-danger';

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg text-foreground">{t('charts.funnel.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('charts.funnel.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${badgeColor} text-white`}>{rate.toFixed(1)}%</Badge>
          <Button variant="outline" onClick={() => exportConversionFunnelToCSV(transformed || [], 'conversion-funnel.csv')}>
            <Download className="ms-2 h-4 w-4 rtl:rotate-180" /> {t('charts.funnel.export')}
          </Button>
        </div>
      </div>

      <div style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={transformed} margin={{ left: 20, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="stage" type="category" width={120} />
            <Tooltip formatter={(v: number) => v.toLocaleString()} />
            <Bar dataKey="count" minPointSize={5}>
              {transformed?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#60a5fa', '#38bdf8', '#14b8a6', '#10b981'][index % 4]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
