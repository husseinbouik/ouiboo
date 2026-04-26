"use client";

import React from 'react';
import { Card, Select } from '@ouiboo/ui';
import { Star } from 'lucide-react';
import type { ChangeEvent } from 'react';

type Trip = { id: string; title: string; bookings: number; revenue: number; avgRating: number; reviewCount: number };

export default function TopTripsTable({ data = [], limit = 5, onLimitChange }: { data?: Trip[]; limit?: number; onLimitChange?: (n: number) => void }) {
  return (
    <Card className="rounded-[2.5rem] shadow-xl shadow-black/5 p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg">Top Performing Trips</h3>
          <p className="text-sm text-slate-500">Your best trips by bookings and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(limit)} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLimitChange?.(Number(e.target.value))}>
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="20">Top 20</option>
          </Select>
        </div>
      </div>

      <table className="min-w-full text-left">
        <thead>
          <tr className="text-sm text-slate-500">
            <th className="px-4 py-2">Rank</th>
            <th className="px-4 py-2">Trip Title</th>
            <th className="px-4 py-2">Bookings</th>
            <th className="px-4 py-2">Revenue</th>
            <th className="px-4 py-2">Avg Rating</th>
            <th className="px-4 py-2">Reviews</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No trips found</td>
            </tr>
          )}
          {data.slice(0, limit).map((trip, idx) => (
            <tr key={trip.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">{idx + 1}</td>
              <td className="px-4 py-3">{trip.title}</td>
              <td className="px-4 py-3">{trip.bookings.toLocaleString()}</td>
              <td className="px-4 py-3">{trip.revenue.toLocaleString('en-MA')} MAD</td>
              <td className="px-4 py-3 flex items-center gap-2">{trip.avgRating.toFixed(1)} <Star className="h-4 w-4 text-amber-400" /></td>
              <td className="px-4 py-3">{trip.reviewCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
