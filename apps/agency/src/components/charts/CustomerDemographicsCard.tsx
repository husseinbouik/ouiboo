"use client";

import React from 'react';
import { Card, Badge } from '@ouiboo/ui';
import { Users, UserCheck, TrendingUp } from 'lucide-react';

export default function CustomerDemographicsCard({ data = { totalCustomers: 0, repeatCustomers: 0, repeatCustomerRate: 0 } }: { data?: { totalCustomers: number; repeatCustomers: number; repeatCustomerRate: number } }) {
  const rate = data.repeatCustomerRate || 0;
  const rateClass = rate > 30 ? 'bg-emerald-500 text-white' : rate >= 15 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700';

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg">Customer Insights</h3>
          <p className="text-sm text-slate-500">Understanding your customer base</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-start">
          <Users className="h-6 w-6 text-slate-500 mb-2" />
          <div className="font-black text-2xl">{data.totalCustomers.toLocaleString()}</div>
          <div className="text-sm text-slate-500">Total Customers</div>
        </div>

        <div className="flex flex-col items-start">
          <UserCheck className="h-6 w-6 text-slate-500 mb-2" />
          <div className="font-black text-2xl">{data.repeatCustomers.toLocaleString()}</div>
          <div className="text-sm text-slate-500">Repeat Customers</div>
        </div>

        <div className="flex flex-col items-start">
          <TrendingUp className="h-6 w-6 text-slate-500 mb-2" />
          <div className={`font-black text-2xl px-3 py-1 rounded-lg ${rateClass}`}>{rate}%</div>
          <div className="text-sm text-slate-500">Repeat Rate</div>
        </div>
      </div>
    </Card>
  );
}
