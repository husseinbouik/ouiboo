"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Button, Input } from '@ouiboo/ui';

export default function DateRangeSelector({ onRangeChange, defaultRange = '7' }: { onRangeChange: (start: Date, end: Date) => void; defaultRange?: string }) {
  const [selected, setSelected] = useState<string>(defaultRange);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const computedRange = useMemo(() => {
    const now = new Date();
    let s: Date = subDays(now, 6);
    let e: Date = now;
    if (selected === '7') { s = subDays(now, 6); e = now; }
    if (selected === '30') { s = subDays(now, 29); e = now; }
    if (selected === '90') { s = subDays(now, 89); e = now; }
    if (selected === 'thisMonth') { s = startOfMonth(now); e = endOfMonth(now); }
    if (selected === 'lastMonth') { const lm = subDays(startOfMonth(now), 1); s = startOfMonth(lm); e = endOfMonth(lm); }
    return {
      start: s.toISOString().slice(0, 10),
      end: e.toISOString().slice(0, 10),
      startDate: s,
      endDate: e,
    };
  }, [selected]);

  const start = selected === 'custom' ? customStart : computedRange.start;
  const end = selected === 'custom' ? customEnd : computedRange.end;

  useEffect(() => {
    if (selected !== 'custom') {
      onRangeChange(computedRange.startDate, computedRange.endDate);
    }
  }, [computedRange, onRangeChange, selected]);

  const handleCustomApply = () => {
    if (new Date(end) < new Date(start)) return;
    onRangeChange(new Date(start), new Date(end));
    setSelected('custom');
  };

  const handlePresetSelect = (value: string) => {
    const range = (() => {
      const now = new Date();
      let startDate = subDays(now, 6);
      let endDate = now;
      if (value === '30') { startDate = subDays(now, 29); endDate = now; }
      if (value === '90') { startDate = subDays(now, 89); endDate = now; }
      if (value === 'thisMonth') { startDate = startOfMonth(now); endDate = endOfMonth(now); }
      if (value === 'lastMonth') {
        const lastMonth = subDays(startOfMonth(now), 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
      }
      return { startDate, endDate };
    })();

    setSelected(value);
    onRangeChange(range.startDate, range.endDate);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex gap-2 flex-wrap">
        <Button variant={selected === '7' ? 'orange' : 'ghost'} onClick={() => handlePresetSelect('7')}>Last 7 days</Button>
        <Button variant={selected === '30' ? 'orange' : 'ghost'} onClick={() => handlePresetSelect('30')}>Last 30 days</Button>
        <Button variant={selected === '90' ? 'orange' : 'ghost'} onClick={() => handlePresetSelect('90')}>Last 90 days</Button>
        <Button variant={selected === 'thisMonth' ? 'orange' : 'ghost'} onClick={() => handlePresetSelect('thisMonth')}>This Month</Button>
        <Button variant={selected === 'lastMonth' ? 'orange' : 'ghost'} onClick={() => handlePresetSelect('lastMonth')}>Last Month</Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={start}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSelected('custom');
            setCustomStart(e.target.value);
          }}
        />
        <Input
          type="date"
          value={end}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSelected('custom');
            setCustomEnd(e.target.value);
          }}
        />
        <Button onClick={handleCustomApply}>Apply</Button>
      </div>
    </div>
  );
}
