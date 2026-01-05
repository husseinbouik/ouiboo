'use client';

import React from 'react';
import { 
  Plus, 
  Clock, 
  Users, 
  Edit,
  Trash,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { Button, Card, CardContent, Input } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

import { DeleteConfirmation } from '@/components/DeleteConfirmation';

export default function AgencyTripsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteTripId, setDeleteTripId] = React.useState<string | null>(null);
  
  const { data: trips, isLoading } = useQuery({
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

  const handleDelete = (id: string) => {
    setDeleteTripId(id);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">{t('sidebar.myTrips')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and monitor your travel packages.</p>
        </div>
        <Link href="/dashboard/trips/create">
          <Button className="h-12 px-6 bg-sunset-orange hover:bg-orange-600 border-none shadow-lg shadow-orange-900/20 gap-2 font-bold">
            <Plus className="h-5 w-5" />
            {t('sidebar.createNew')}
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
        <CardContent className="p-4">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input placeholder="Search trips by name or location..." className="pl-10 h-11 dark:bg-slate-800 dark:border-slate-700" />
              </div>
              <div className="flex gap-2">
                 <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select className="h-11 pl-10 pr-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 dark:text-gray-300 appearance-none min-w-[140px]">
                       <option>All Status</option>
                       <option>Active</option>
                       <option>Draft</option>
                       <option>Archived</option>
                    </select>
                 </div>
                 <div className="relative group">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select className="h-11 pl-10 pr-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 dark:text-gray-300 appearance-none min-w-[140px]">
                       <option>Most Recent</option>
                       <option>Highest Price</option>
                       <option>Most Booked</option>
                    </select>
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 flex justify-center text-gray-500">Loading trips...</div>
        ) : trips && trips.length > 0 ? (
          trips.map((trip: any) => (
            <Card key={trip.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800 flex flex-col">
              <div className="relative h-48 overflow-hidden">
                 <img 
                   src={trip.images?.[0] || `https://ui-avatars.com/api/?name=${trip.title}&background=1E3A8A&color=fff`} 
                   alt={trip.title} 
                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                 />
                 <div className="absolute top-4 right-4">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleStatus(trip.id, trip.status);
                      }}
                      disabled={updateStatusMutation.isPending}
                      className={cn(
                        "text-[10px] px-2.5 py-1.5 rounded-lg font-bold shadow-sm backdrop-blur-md uppercase tracking-wider transition-all hover:scale-105 active:scale-95",
                        trip.status === 'ACTIVE' ? "bg-green-500/90 text-white" : "bg-slate-500/90 text-white"
                      )}
                    >
                      {updateStatusMutation.isPending && updateStatusMutation.variables?.id === trip.id ? '...' : trip.status}
                    </button>
                 </div>
              </div>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="mb-2">
                   <span className="text-[10px] font-bold text-sunset-orange dark:text-orange-400 uppercase tracking-widest">{trip.category}</span>
                   <Link href={`/dashboard/trips/${trip.id}`} className="block">
                    <h3 className="text-xl font-bold text-deep-blue dark:text-gray-100 mt-1 line-clamp-1 hover:text-sunset-orange transition-colors">{trip.title}</h3>
                   </Link>
                </div>
                
                <div className="flex items-center gap-4 my-4 py-4 border-y border-gray-50 dark:border-slate-800 text-gray-500 dark:text-gray-400 text-sm">
                   <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {trip.durationDays}D / {trip.durationNights}N
                   </div>
                   <div className="flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-gray-400" />
                      {trip.sessions?.reduce((acc: number, s: any) => acc + (s._count?.bookings || 0), 0)} sales
                   </div>
                </div>

                <div className="mt-auto flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">From</p>
                      <p className="text-lg font-bold text-deep-blue dark:text-blue-400">{trip.sessions?.[0]?.price?.toLocaleString() || 0} MAD</p>
                   </div>
                   <div className="flex gap-1">
                      <Link href={`/dashboard/trips/${trip.id}`}>
                        <button className="p-2 text-gray-400 hover:text-deep-blue dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                           <Edit className="h-5 w-5" />
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDelete(trip.id)}
                        disabled={deleteTripMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                         <Trash className="h-5 w-5" />
                      </button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : null}

        {/* Add New Card */}
        <Link href="/dashboard/trips/create" className="group">
           <div className="h-full min-h-[380px] border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-sunset-orange/50 hover:bg-orange-50/10 dark:hover:bg-orange-950/10 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 group-hover:bg-sunset-orange group-hover:text-white transition-all duration-300 shadow-sm">
                 <Plus className="h-8 w-8" />
              </div>
              <div className="text-center">
                 <p className="font-bold text-gray-600 dark:text-gray-400 group-hover:text-deep-blue dark:group-hover:text-blue-400 transition-colors uppercase text-sm tracking-wide">Create Trip</p>
                 <p className="text-xs text-gray-400">Expand your travel catalog</p>
              </div>
           </div>
        </Link>
      </div>

      <DeleteConfirmation 
        isOpen={!!deleteTripId}
        onClose={() => setDeleteTripId(null)}
        onConfirm={() => deleteTripId && deleteTripMutation.mutate(deleteTripId)}
        isLoading={deleteTripMutation.isPending}
        title="Delete Trip Template"
        description="Are you sure you want to delete this trip? All associated sessions and bookings will be permanently removed. This action cannot be undone."
      />
    </div>
  );
}
