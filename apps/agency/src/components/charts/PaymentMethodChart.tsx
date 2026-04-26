"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, Badge } from '@ouiboo/ui';

export default function PaymentMethodChart({ data = { MANUAL: 0, GATEWAY: 0 } }: { data?: { MANUAL: number; GATEWAY: number } }) {
  const transformed = useMemo(() => {
    return [
      { name: 'Manual Payment', value: data.MANUAL || 0 },
      { name: 'Online Gateway', value: data.GATEWAY || 0 },
    ];
  }, [data]);

  const total = transformed.reduce((s, r) => s + r.value, 0);

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg">Payment Methods</h3>
          <p className="text-sm text-slate-500">Distribution of payment types</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500 text-white">Manual</Badge>
          <Badge className="bg-emerald-500 text-white">Gateway</Badge>
        </div>
      </div>

      <div style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={transformed} dataKey="value" nameKey="name" outerRadius={90} label={(entry) => `${Math.round((entry.value / (total || 1)) * 100)}%`}>
              {transformed.map((_, i) => (
                <Cell key={`cell-${i}`} fill={i === 0 ? '#f59e0b' : '#10b981'} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => v.toLocaleString()} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
