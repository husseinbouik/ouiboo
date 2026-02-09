"use client";

import React, { useState, useEffect } from 'react';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Button, Input } from '@ouiboo/ui';

export default function DateRangeSelector({ onRangeChange, defaultRange = '7' }: { onRangeChange: (start: Date, end: Date) => void; defaultRange?: string }) {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [selected, setSelected] = useState<string>(defaultRange);

  useEffect(() => {
    const now = new Date();
    let s: Date = subDays(now, 6);
    let e: Date = now;
    if (selected === '7') { s = subDays(now, 6); e = now; }
    if (selected === '30') { s = subDays(now, 29); e = now; }
    if (selected === '90') { s = subDays(now, 89); e = now; }
    if (selected === 'thisMonth') { s = startOfMonth(now); e = endOfMonth(now); }
    if (selected === 'lastMonth') { const lm = subDays(startOfMonth(now), 1); s = startOfMonth(lm); e = endOfMonth(lm); }
    setStart(s.toISOString().slice(0,10));
    setEnd(e.toISOString().slice(0,10));
    onRangeChange(s, e);
  }, [selected]);

  const handleCustomApply = () => {
    if (new Date(end) < new Date(start)) return;
    onRangeChange(new Date(start), new Date(end));
    setSelected('custom');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex gap-2 flex-wrap">
        <Button variant={selected === '7' ? 'primary' : 'ghost'} onClick={() => setSelected('7')}>Last 7 days</Button>
        <Button variant={selected === '30' ? 'primary' : 'ghost'} onClick={() => setSelected('30')}>Last 30 days</Button>
        <Button variant={selected === '90' ? 'primary' : 'ghost'} onClick={() => setSelected('90')}>Last 90 days</Button>
        <Button variant={selected === 'thisMonth' ? 'primary' : 'ghost'} onClick={() => setSelected('thisMonth')}>This Month</Button>
        <Button variant={selected === 'lastMonth' ? 'primary' : 'ghost'} onClick={() => setSelected('lastMonth')}>Last Month</Button>
      </div>

      <div className="flex items-center gap-2">
        <Input type="date" value={start} onChange={(e: any) => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={(e: any) => setEnd(e.target.value)} />
        <Button onClick={handleCustomApply}>Apply</Button>
      </div>
    </div>
  );
}
