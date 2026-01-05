'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@ouiboo/ui';
import { useAuth } from '@/components/AuthContext';
import { Calendar, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MyBookingsPage() {
    const { user } = useAuth();
    
    const { data: bookings, isLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: async () => {
           const response = await apiClient.get('/bookings/my-bookings');
           return response.data;
        },
        enabled: !!user
    });

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-sunset-orange" />
                <p className="text-xl font-black text-foreground font-display animate-pulse">Loading your adventures...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-5xl font-black text-foreground font-display tracking-tight">My Bookings</h1>
                    <div className="h-1 w-24 bg-sunset-orange rounded-full" />
                </div>
                
                <div className="space-y-8">
                    {bookings?.length > 0 ? (
                        bookings.map((booking: any) => (
                            <Card key={booking.id} className="group border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border hover:shadow-xl transition-all duration-300 rounded-[2.5rem] overflow-hidden bg-card">
                                <div className="flex flex-col md:flex-row">
                                    <div className="w-full md:w-64 h-48 md:h-auto overflow-hidden">
                                        <img 
                                            src={booking.session?.template?.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} 
                                            alt="Trip" 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-8 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                                                <h3 className="text-2xl font-black text-foreground group-hover:text-sunset-orange transition-colors font-display tracking-tight leading-tight">{booking.session?.template?.title}</h3>
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                    booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    booking.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    'bg-muted text-muted-foreground border border-border'
                                                }`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-6">
                                                <span className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                                                    <Calendar className="h-4 w-4 text-sunset-orange" />
                                                    {format(new Date(booking.session?.startDate), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                                                    <MapPin className="h-4 w-4 text-sunset-orange" />
                                                    {booking.session?.template?.startLocation}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap justify-between items-end gap-4">
                                            <div className="text-sm font-bold text-muted-foreground">
                                                <span className="text-foreground">{booking.guestsCount}</span> Guest(s) • Total Amount
                                            </div>
                                            <div className="text-right">
                                                <span className="text-3xl font-black text-foreground">{booking.totalAmount} <span className="text-sm font-bold text-muted-foreground uppercase">MAD</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-24 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-4xl">🏜️</div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-foreground font-display">No bookings found</h3>
                                <p className="text-muted-foreground font-medium">Your upcoming adventures will appear here once you book them.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
