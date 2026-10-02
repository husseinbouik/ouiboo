"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Select } from '@ouiboo/ui';
import { Star } from 'lucide-react';
import { formatCurrency } from '@ouiboo/utils';
import type { ChangeEvent } from 'react';

type Trip = { id: string; title: string; bookings: number; revenue: number; avgRating: number; reviewCount: number };

export default function TopTripsTable({ data = [], limit = 5, onLimitChange }: { data?: Trip[]; limit?: number; onLimitChange?: (n: number) => void }) {
  const { t, i18n } = useTranslation();

  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6 overflow-x-auto">
<div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg text-foreground">{t('charts.topTrips.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('charts.topTrips.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(limit)}
            aria-label={t('charts.topTrips.title')}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onLimitChange?.(Number(e.target.value))}
          >
            <option value="5">{t('charts.topTrips.top5')}</option>
            <option value="10">{t('charts.topTrips.top10')}</option>
            <option value="20">{t('charts.topTrips.top20')}</option>
          </Select>
        </div>
      </div>

      <table className="min-w-full text-start">
        <thead>
          <tr className="text-sm text-muted-foreground">
            <th className="px-4 py-2">{t('charts.topTrips.colRank')}</th>
            <th className="px-4 py-2">{t('charts.topTrips.colTrip')}</th>
            <th className="px-4 py-2">{t('charts.topTrips.colBookings')}</th>
            <th className="px-4 py-2">{t('charts.topTrips.colRevenue')}</th>
            <th className="px-4 py-2">{t('charts.topTrips.colAvgRating')}</th>
            <th className="px-4 py-2">{t('charts.topTrips.colReviews')}</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">{t('charts.topTrips.empty')}</td>
            </tr>
          )}
          {data.slice(0, limit).map((trip, idx) => (
            <tr key={trip.id} className="hover:bg-muted">
              <td className="px-4 py-3 text-foreground">{idx + 1}</td>
              <td className="px-4 py-3 text-foreground">{trip.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{trip.bookings.toLocaleString(i18n.language)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatCurrency(trip.revenue, undefined, i18n.language)}</td>
              <td className="px-4 py-3 flex items-center gap-2 text-muted-foreground">{trip.avgRating.toFixed(1)} <Star className="h-4 w-4 text-warning" /></td>
              <td className="px-4 py-3 text-muted-foreground">{trip.reviewCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
