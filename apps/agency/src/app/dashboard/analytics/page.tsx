"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import DateRangeSelector from '../../../components/charts/DateRangeSelector';
import RevenueTrendChart from '../../../components/charts/RevenueTrendChart';
import ConversionFunnelChart from '../../../components/charts/ConversionFunnelChart';
import TopTripsTable from '../../../components/charts/TopTripsTable';
import PaymentMethodChart from '../../../components/charts/PaymentMethodChart';
import CustomerDemographicsCard from '../../../components/charts/CustomerDemographicsCard';
import { LineChartSkeleton, PieChartSkeleton, TableSkeleton } from '../../../components/charts/ChartSkeleton';
import { motion } from 'framer-motion';
import { Card, Button } from '@ouiboo/ui';
import { format } from 'date-fns';

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [limit, setLimit] = useState(5);

  const rangeLabel = useMemo(() => `${format(startDate, 'MMM d, yyyy')} — ${format(endDate, 'MMM d, yyyy')}`, [startDate, endDate]);

  const qRevenue = useQuery(['analytics-revenue-trends', startDate.toISOString(), endDate.toISOString(), period], async () => {
    const res = await apiClient.get('/analytics/revenue-trends', { params: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period } });
    return res.data;
  }, { staleTime: 5 * 60 * 1000, cacheTime: 10 * 60 * 1000 });

  const qFunnel = useQuery(['analytics-conversion-funnel', startDate.toISOString(), endDate.toISOString()], async () => {
    const res = await apiClient.get('/analytics/conversion-funnel', { params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } });
    return res.data;
  }, { staleTime: 5 * 60 * 1000 });

  const qTopTrips = useQuery(['analytics-top-trips', limit], async () => {
    const res = await apiClient.get('/analytics/top-trips', { params: { limit } });
    return res.data;
  }, { staleTime: 5 * 60 * 1000 });

  const qPayment = useQuery(['analytics-payment-methods'], async () => {
    const res = await apiClient.get('/analytics/payment-methods');
    return res.data;
  }, { staleTime: 5 * 60 * 1000 });

  const qCustomers = useQuery(['analytics-customer-demographics'], async () => {
    const res = await apiClient.get('/analytics/customer-demographics');
    return res.data;
  }, { staleTime: 5 * 60 * 1000 });

  const onRangeChange = useCallback((s: Date, e: Date) => { setStartDate(s); setEndDate(e); }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-2xl">Analytics Dashboard</h1>
          <p className="text-slate-500">Overview of revenue, conversions and customers</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeSelector onRangeChange={onRangeChange} defaultRange="30" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {qRevenue.isLoading ? <LineChartSkeleton /> : qRevenue.isError ? (
            <Card className="p-6">Error loading revenue. <Button onClick={() => qRevenue.refetch()}>Retry</Button></Card>
          ) : (
            <RevenueTrendChart data={qRevenue.data?.data || qRevenue.data || []} period={period} rangeLabel={rangeLabel} />
          )}
        </div>

        <div>
          {qFunnel.isLoading ? <LineChartSkeleton /> : qFunnel.isError ? (
            <Card className="p-6">Error loading funnel. <Button onClick={() => qFunnel.refetch()}>Retry</Button></Card>
          ) : (
            <ConversionFunnelChart data={qFunnel.data || qFunnel.data?.data} />
          )}
        </div>

        <div>
          {qTopTrips.isLoading ? <TableSkeleton /> : qTopTrips.isError ? (
            <Card className="p-6">Error loading top trips. <Button onClick={() => qTopTrips.refetch()}>Retry</Button></Card>
          ) : (
            <TopTripsTable data={qTopTrips.data?.data || qTopTrips.data || []} limit={limit} onLimitChange={setLimit} />
          )}
        </div>

        <div>
          {qPayment.isLoading ? <PieChartSkeleton /> : qPayment.isError ? (
            <Card className="p-6">Error loading payments. <Button onClick={() => qPayment.refetch()}>Retry</Button></Card>
          ) : (
            <PaymentMethodChart data={qPayment.data || qPayment.data?.data} />
          )}
        </div>

        <div className="md:col-span-2">
          {qCustomers.isLoading ? <LineChartSkeleton /> : qCustomers.isError ? (
            <Card className="p-6">Error loading customers. <Button onClick={() => qCustomers.refetch()}>Retry</Button></Card>
          ) : (
            <CustomerDemographicsCard data={qCustomers.data || qCustomers.data?.data} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
