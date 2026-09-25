'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Clock,
  Users,
  Edit,
  Trash,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { Button, Card, CardContent, Input } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@ouiboo/utils';

import { DeleteConfirmation } from '@/components/DeleteConfirmation';

type AgencyTripSessionSummary = {
  id: string;
  price: number;
  _count?: {
    bookings?: number;
  };
};

type AgencyTripSummary = {
  id: string;
  title: string;
  category?: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  startLocation?: string | null;
  durationDays: number;
  durationNights: number;
  createdAt?: string;
  images?: string[] | null;
  sessions?: AgencyTripSessionSummary[];
};

type TripSortOption = 'recent' | 'price' | 'sales';

export default function AgencyTripsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteTripId, setDeleteTripId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | AgencyTripSummary['status']>('ALL');
  const [sortBy, setSortBy] = React.useState<TripSortOption>('recent');

  const { data: trips = [], isLoading } = useQuery<AgencyTripSummary[]>({
    queryKey: ['agency-trips'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/trips');
      return response.data;
    }
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/trips/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      setDeleteTripId(null);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await apiClient.patch(`/trips/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const tripStatusLabel = (status: AgencyTripSummary['status']) => {
    switch (status) {
      case 'ACTIVE':
        return t('trips.filterActive');
      case 'DRAFT':
        return t('trips.filterDraft');
      default:
        return t('trips.filterArchived');
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTripId(id);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const filteredTrips = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = trips.filter((trip) => {
      const matchesSearch =
        !normalizedSearch ||
        trip.title.toLowerCase().includes(normalizedSearch) ||
        trip.startLocation?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((left, right) => {
      if (sortBy === 'price') {
        const leftPrice = left.sessions?.[0]?.price || 0;
        const rightPrice = right.sessions?.[0]?.price || 0;
        return rightPrice - leftPrice;
      }

      if (sortBy === 'sales') {
        const leftSales = left.sessions?.reduce((acc, session) => acc + (session._count?.bookings || 0), 0) || 0;
        const rightSales = right.sessions?.reduce((acc, session) => acc + (session._count?.bookings || 0), 0) || 0;
        return rightSales - leftSales;
      }

      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });
  }, [searchTerm, sortBy, statusFilter, trips]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('sidebar.myTrips')}</h1>
          <p className="text-muted-foreground mt-1">{t('trips.manageTitle')}</p>
        </div>
        <Link href="/dashboard/trips/create">
          <Button className="h-12 px-6 bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-lg shadow-accent/20 gap-2 font-bold">
            <Plus className="h-5 w-5" />
            {t('sidebar.createNew')}
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm bg-card border border-border">
        <CardContent className="p-4">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder={t('trips.searchPlaceholder')}
                   aria-label={t('trips.searchPlaceholder')}
                   className="ps-10 h-11"
                   value={searchTerm}
                   onChange={(event) => setSearchTerm(event.target.value)}
                 />
              </div>
              <div className="flex gap-2">
                 <div className="relative group">
                    <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={statusFilter}
                      aria-label={t('trips.filterAll')}
                      onChange={(event) => setStatusFilter(event.target.value as 'ALL' | AgencyTripSummary['status'])}
                      className="h-11 ps-10 pe-4 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[140px]"
                    >
                       <option value="ALL">{t('trips.filterAll')}</option>
                       <option value="ACTIVE">{t('trips.filterActive')}</option>
                       <option value="DRAFT">{t('trips.filterDraft')}</option>
                       <option value="ARCHIVED">{t('trips.filterArchived')}</option>
                    </select>
                 </div>
                 <div className="relative group">
                    <ArrowUpDown className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={sortBy}
                      aria-label={t('trips.sortRecent')}
                      onChange={(event) => setSortBy(event.target.value as TripSortOption)}
                      className="h-11 ps-10 pe-4 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[140px]"
                    >
                       <option value="recent">{t('trips.sortRecent')}</option>
                       <option value="price">{t('trips.sortPrice')}</option>
                       <option value="sales">{t('trips.sortSales')}</option>
                    </select>
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 flex justify-center text-muted-foreground">{t('trips.loading')}</div>
        ) : filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => (
            <Card key={trip.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-card border border-border flex flex-col">
              <div className="relative h-48 overflow-hidden">
                 <Image
                   src={trip.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(trip.title)}&background=0A192F&color=fff`}
                   alt={trip.title}
                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                   fill
                   sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                 />
                 <div className="absolute top-4 end-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleStatus(trip.id, trip.status);
                      }}
                      disabled={updateStatusMutation.isPending}
                      aria-label={tripStatusLabel(trip.status)}
                      className={cn(
                        "text-[10px] px-2.5 py-1.5 rounded-lg font-bold shadow-sm backdrop-blur-md uppercase tracking-wider transition-all hover:scale-105 active:scale-95",
                        trip.status === 'ACTIVE' ? "bg-success/90 text-success-foreground" : "bg-slate-500/90 text-white"
                      )}
                    >
                      {updateStatusMutation.isPending && updateStatusMutation.variables?.id === trip.id ? '...' : tripStatusLabel(trip.status)}
                    </button>
                 </div>
              </div>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="mb-2">
                   <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{trip.category}</span>
                   <Link href={`/dashboard/trips/${trip.id}`} className="block">
                    <h3 className="text-xl font-bold text-foreground mt-1 line-clamp-1 hover:text-accent transition-colors">{trip.title}</h3>
                   </Link>
                </div>

                <div className="flex items-center gap-4 my-4 py-4 border-y border-border text-muted-foreground text-sm">
                   <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {t('trips.durationShort', { days: trip.durationDays, nights: trip.durationNights })}
                   </div>
                   <div className="flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {t('trips.salesCount', { count: trip.sessions?.reduce((acc, session) => acc + (session._count?.bookings || 0), 0) || 0 })}
                   </div>
                </div>

                <div className="mt-auto flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{t('trips.from')}</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(trip.sessions?.[0]?.price || 0, undefined, i18n.language)}</p>
                   </div>
                   <div className="flex gap-1">
                      <Link href={`/dashboard/trips/${trip.id}`} aria-label={t('common.edit')}>
                        <button className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors">
                           <Edit className="h-5 w-5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        disabled={deleteTripMutation.isPending}
                        aria-label={t('common.delete')}
                        className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                         <Trash className="h-5 w-5" />
                      </button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="border-none shadow-sm bg-card border border-border">
              <CardContent className="py-16 text-center">
                <p className="text-lg font-bold text-foreground">{t('trips.emptyTitle')}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('trips.emptyBody')}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setSortBy('recent'); }}>
                    {t('trips.clearFilters')}
                  </Button>
                  <Link href="/dashboard/trips/create">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 border-none">{t('trips.createCta')}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add New Card */}
        <Link href="/dashboard/trips/create" className="group">
           <div className="h-full min-h-[380px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300 shadow-sm">
                 <Plus className="h-8 w-8" />
              </div>
              <div className="text-center">
                 <p className="font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase text-sm tracking-wide">{t('trips.createTitle')}</p>
                 <p className="text-xs text-muted-foreground">{t('trips.expandCatalog')}</p>
              </div>
           </div>
        </Link>
      </div>

      <DeleteConfirmation
        isOpen={!!deleteTripId}
        onClose={() => setDeleteTripId(null)}
        onConfirm={() => deleteTripId && deleteTripMutation.mutate(deleteTripId)}
        isLoading={deleteTripMutation.isPending}
        title={t('trips.deleteTitle')}
        description={t('trips.deleteBody')}
      />
    </div>
  );
}
