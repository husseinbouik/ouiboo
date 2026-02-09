"use client";

import React from 'react';
import { Card } from '@ouiboo/ui';

export function LineChartSkeleton() {
  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="animate-pulse bg-slate-100 h-64 rounded-lg" />
    </Card>
  );
}

export function PieChartSkeleton() {
  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="animate-pulse bg-slate-100 h-64 w-64 rounded-full mx-auto" />
    </Card>
  );
}

export function TableSkeleton() {
  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6">
      <div className="space-y-3">
        <div className="animate-pulse h-4 bg-slate-100 rounded w-3/4" />
        <div className="animate-pulse h-40 bg-slate-100 rounded" />
      </div>
    </Card>
  );
}

export default LineChartSkeleton;
