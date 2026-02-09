"use client";

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area } from 'recharts';
import { format } from 'date-fns';
import { Card, Button } from '@ouiboo/ui';
import { Download } from 'lucide-react';
import { exportRevenueTrendsToCSV } from '../../lib/export-utils';

type Point = { date: string; amount: number };

export default function RevenueTrendChart({ data, period, rangeLabel }: { data?: Point[]; period: 'daily' | 'weekly' | 'monthly'; rangeLabel?: string }) {
  const [mode] = useState(period);

  const formatted = useMemo(() => {
    if (!data) return undefined;
    return data.map((d) => ({
      ...d,
      label: format(new Date(d.date), mode === 'daily' ? 'MMM d' : mode === 'weekly' ? 'MMM d' : 'MMM yyyy'),
    }));
  }, [data, mode]);

  if (!data) {
    return (
      <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
        <div className="animate-pulse h-64 bg-slate-100 rounded-lg" />
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
        <div className="text-sm text-slate-500">No revenue data for the selected period.</div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg">Revenue Trends</h3>
          {rangeLabel && <p className="text-sm text-slate-500">{rangeLabel}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportRevenueTrendsToCSV(data, 'revenue-trends.csv')}>
            <Download className="mr-2 h-4 w-4" /> Export
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
            <YAxis tickFormatter={(v) => `${v.toLocaleString('en-MA')} MAD`} />
            <Tooltip formatter={(value: number) => `${value.toLocaleString('en-MA')} MAD`} labelFormatter={(l) => l} />
            <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#grad)" />
            <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
