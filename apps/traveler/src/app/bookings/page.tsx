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
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-deep-blue mb-8">My Bookings</h1>
            
            <div className="space-y-6">
                {bookings?.length > 0 ? (
                    bookings.map((booking: any) => (
                        <Card key={booking.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="w-full md:w-48 h-32 md:h-auto bg-gray-200">
                                    <img 
                                        src={booking.session?.template?.images?.[0] || 'https://via.placeholder.com/300'} 
                                        alt="Trip" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-deep-blue">{booking.session?.template?.title}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-gray-500 flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(booking.session?.startDate), 'MMM dd, yyyy')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                {booking.session?.template?.startLocation}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="text-sm text-gray-500">
                                            {booking.guestsCount} Guest(s) • Total: <span className="font-bold text-deep-blue">{booking.totalAmount} MAD</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <p className="text-gray-500">You haven't booked any trips yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
