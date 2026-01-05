'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Users, 
  MapPin, 
  Clock, 
  ChevronLeft,
  Settings,
  MoreVertical,
  Trash,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Badge,
  Input,
  Label
} from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

function TripDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-96 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    </div>
  );
}

import { DeleteConfirmation } from '@/components/DeleteConfirmation';

export default function TripDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const [showAddSession, setShowAddSession] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { register: registerSession, handleSubmit: handleSessionSubmit, reset: resetSession, formState: { errors: sessionErrors } } = useForm({
    defaultValues: {
        startDate: '',
        endDate: '',
        price: 0,
        totalSeats: 20
    }
  });

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', params.id],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${params.id}`);
      return response.data;
    }
  });

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/trips/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      router.push('/dashboard/trips');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiClient.patch(`/trips/${params.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
        const response = await apiClient.post(`/trips/${params.id}/sessions`, data);
        return response.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
        queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
        setShowAddSession(false);
        resetSession();
    }
  });

  const onSessionSubmit = (data: any) => {
    createSessionMutation.mutate(data);
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleToggleStatus = () => {
    if (!trip) return;
    const newStatus = trip.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    updateStatusMutation.mutate(newStatus);
  };

  if (isLoading) return <TripDetailSkeleton />;
  if (error || !trip) return <div className="py-12 text-center text-red-500">Error loading trip.</div>;

  const sessions = trip.sessions || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-gray-500 hover:text-deep-blue transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
                "gap-2",
                trip.status === 'ACTIVE' ? "text-emerald-600 border-emerald-100 bg-emerald-50/50" : "text-slate-600 border-slate-100 bg-slate-50/50"
            )}
            onClick={handleToggleStatus}
            disabled={updateStatusMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4" /> 
            {updateStatusMutation.isPending ? 'Updating...' : (trip.status === 'ACTIVE' ? 'Set to Draft' : 'Activate Trip')}
          </Button>
          <Link href={`/dashboard/trips/${params.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" /> Edit Template
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
            onClick={handleDelete}
            disabled={deleteTripMutation.isPending}
          >
            <Trash className="h-4 w-4" /> {deleteTripMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trip Template Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
             <div className="h-48 bg-gray-200 dark:bg-slate-800">
                <img src={trip.images?.[0] || "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop"} alt="Trip" className="w-full h-full object-cover" />
             </div>
             <CardContent className="p-6 space-y-4">
                <div>
                   <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-sunset-orange border-sunset-orange/20 mb-2">{trip.category}</Badge>
                   <h1 className="text-2xl font-bold text-deep-blue dark:text-gray-100">{trip.title}</h1>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4 text-gray-400" /> {trip.startLocation}
                   </div>
                   <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 text-gray-400" /> {trip.durationDays} Days / {trip.durationNights} Nights
                   </div>
                </div>
                <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
                   <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic line-clamp-3">
                      {trip.description}
                   </p>
                </div>
             </CardContent>
          </Card>
          
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-6 space-y-2">
             <div className="flex items-center gap-2 text-blue-900 dark:text-blue-400 font-bold">
                <AlertCircle className="h-5 w-5" />
                <span>Verification Required</span>
             </div>
             <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                Your agency verification is pending. You can create templates and sessions, but they won't be visible to travelers until your profile is verified.
             </p>
             <Link href="/dashboard/onboarding" className="inline-block text-sm font-bold text-blue-900 dark:text-blue-400 underline mt-2">
                Check Verification Status
             </Link>
          </div>
        </div>

        {/* Scheduler / Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-deep-blue dark:text-gray-100 flex items-center gap-2">
                 <CalendarIcon className="h-5 w-5 text-sunset-orange" />
                 Trip Scheduler
              </h2>
              <p className="text-sm text-gray-500 mt-1">Add dates and prices to your trip template.</p>
            </div>
            <Button 
              onClick={() => setShowAddSession(!showAddSession)} 
              className="bg-deep-blue hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 gap-2 shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> {showAddSession ? 'Cancel' : 'Add Session'}
            </Button>
          </div>

          {showAddSession && (
             <Card className="border-2 border-sunset-orange/20 shadow-xl animate-in slide-in-from-top-4 duration-300 dark:bg-slate-900 dark:border-slate-800">
                <form onSubmit={handleSessionSubmit(onSessionSubmit)}>
                    <CardHeader>
                       <CardTitle>Schedule New Session</CardTitle>
                       <CardDescription>Input dates, price, and available seats for this specific trip occurrence.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label htmlFor="startDate">Start Date</Label>
                             <Input 
                                id="startDate" 
                                type="date" 
                                {...registerSession('startDate', { required: true })}
                                className="h-11 dark:bg-slate-800 dark:border-slate-700" 
                             />
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="endDate">End Date</Label>
                             <Input 
                                id="endDate" 
                                type="date" 
                                {...registerSession('endDate', { required: true })}
                                className="h-11 dark:bg-slate-800 dark:border-slate-700" 
                             />
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="price">Price (per person)</Label>
                             <div className="relative">
                                <Input 
                                    id="price" 
                                    type="number" 
                                    {...registerSession('price', { valueAsNumber: true, required: true, min: 1 })}
                                    className="h-11 pr-12 dark:bg-slate-800 dark:border-slate-700" 
                                    placeholder="0.00" 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 tracking-tighter">MAD</span>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="seats">Total Seats</Label>
                             <Input 
                                id="seats" 
                                type="number" 
                                {...registerSession('totalSeats', { valueAsNumber: true, required: true, min: 1 })}
                                className="h-11 dark:bg-slate-800 dark:border-slate-700" 
                                placeholder="20" 
                             />
                          </div>
                       </div>
                       <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                          <Button type="button" variant="outline" onClick={() => setShowAddSession(false)}>Cancel</Button>
                          <Button 
                            type="submit" 
                            disabled={createSessionMutation.isPending}
                            className="bg-sunset-orange hover:bg-orange-600 px-8"
                          >
                            {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
                          </Button>
                       </div>
                    </CardContent>
                </form>
             </Card>
          )}

          <div className="space-y-4">
             {sessions.map((session: any) => (
                <Card key={session.id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group dark:bg-slate-900 border dark:border-slate-800">
                   <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                         <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                               <h3 className="font-bold text-lg text-deep-blue dark:text-gray-100">
                                  {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                                  {new Date(session.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                               </h3>
                               <Badge variant={session.status === 'OPEN' ? 'success' : 'destructive'} className="uppercase text-[10px]">
                                  {session.status}
                               </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                               <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-500">
                                  <Users className="h-4 w-4" /> {session.availableSeats} seats left
                               </span>
                               <span className="w-1 h-1 bg-gray-300 dark:bg-slate-700 rounded-full"></span>
                               <span>Total: {session.totalSeats} seats</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-8 px-6 border-x border-gray-50 dark:border-slate-800">
                            <div className="text-center">
                               <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">Price</p>
                               <p className="font-bold text-xl text-deep-blue dark:text-blue-400">{session.price} <span className="text-xs font-normal">MAD</span></p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Manage Guests</Button>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-deep-blue dark:hover:text-blue-400">
                               <MoreVertical className="h-5 w-5" />
                            </Button>
                         </div>
                      </div>
                   </CardContent>
                </Card>
             ))}
             {sessions.length === 0 && (
               <div className="py-12 text-center text-gray-500">No sessions scheduled yet.</div>
             )}
          </div>
        </div>
      </div>

      <DeleteConfirmation 
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteTripMutation.mutate()}
        isLoading={deleteTripMutation.isPending}
        title="Delete Trip Template"
        description="Are you sure you want to delete this trip template? All associated sessions and bookings will be permanently removed. This action cannot be undone."
      />
    </div>
  );
}
