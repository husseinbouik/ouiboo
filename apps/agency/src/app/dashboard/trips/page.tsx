'use client';

import React from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Users, 
  MoreVertical,
  Edit,
  Trash,
  ExternalLink
} from 'lucide-react';
import { Button, Card, CardContent, Input } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';

const trips = [
  { 
    id: 1, 
    name: 'Marrakech Desert Adventure', 
    status: 'Active', 
    bookings: 45, 
    price: '1,200 MAD', 
    duration: '5 Days', 
    category: 'Adventure',
    image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop'
  },
  { 
    id: 2, 
    name: 'Chefchaouen Blue city Wander', 
    status: 'Draft', 
    bookings: 0, 
    price: '850 MAD', 
    duration: '3 Days', 
    category: 'Cultural',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bbaa?q=80&w=2070&auto=format&fit=crop'
  },
  { 
    id: 3, 
    name: 'Sahara Stargazing Trek', 
    status: 'Active', 
    bookings: 28, 
    price: '2,500 MAD', 
    duration: '7 Days', 
    category: 'Luxury',
    image: 'https://images.unsplash.com/photo-1489493585363-d69421e0dee3?q=80&w=2070&auto=format&fit=crop'
  },
];

export default function AgencyTripsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue">My Trips</h1>
          <p className="text-gray-500 mt-1">Manage and monitor your travel packages.</p>
        </div>
        <Link href="/dashboard/trips/create">
          <Button className="h-12 px-6 bg-sunset-orange hover:bg-orange-600 border-none shadow-lg shadow-orange-900/20 gap-2">
            <Plus className="h-5 w-5" />
            Create Trip
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                 <Input placeholder="Search trips by name or location..." className="h-11" />
              </div>
              <div className="flex gap-2">
                 <select className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Draft</option>
                    <option>Archived</option>
                 </select>
                 <select className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5">
                    <option>Most Recent</option>
                    <option>Highest Price</option>
                    <option>Most Booked</option>
                 </select>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <Card key={trip.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white flex flex-col">
            <div className="relative h-48 overflow-hidden">
               <img src={trip.image} alt={trip.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               <div className="absolute top-4 right-4">
                  <span className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-bold shadow-sm backdrop-blur-md",
                    trip.status === 'Active' ? "bg-green-500/90 text-white" : "bg-gray-500/90 text-white"
                  )}>
                    {trip.status}
                  </span>
               </div>
            </div>
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="mb-2">
                 <span className="text-[10px] font-bold text-sunset-orange uppercase tracking-widest">{trip.category}</span>
                 <h3 className="text-xl font-bold text-deep-blue mt-1 line-clamp-1">{trip.name}</h3>
              </div>
              
              <div className="flex items-center gap-4 my-4 py-4 border-y border-gray-50 text-gray-500 text-sm">
                 <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {trip.duration}
                 </div>
                 <div className="flex items-center gap-1.5 font-medium">
                    <Users className="h-4 w-4 text-gray-400" />
                    {trip.bookings} units sold
                 </div>
              </div>

              <div className="mt-auto flex items-center justify-between">
                 <div>
                    <p className="text-xs text-gray-400 font-medium">Price starting at</p>
                    <p className="text-lg font-bold text-deep-blue">{trip.price}</p>
                 </div>
                 <div className="flex gap-1">
                    <button className="p-2 text-gray-400 hover:text-deep-blue hover:bg-gray-50 rounded-lg transition-colors">
                       <Edit className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-deep-blue hover:bg-gray-50 rounded-lg transition-colors">
                       <ExternalLink className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                       <Trash className="h-5 w-5" />
                    </button>
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Card */}
        <Link href="/dashboard/trips/create" className="group">
           <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-sunset-orange/50 hover:bg-orange-50/10 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-sunset-orange group-hover:text-white transition-all duration-300 shadow-sm">
                 <Plus className="h-8 w-8" />
              </div>
              <div className="text-center">
                 <p className="font-bold text-gray-600 group-hover:text-deep-blue transition-colors">Create New Trip</p>
                 <p className="text-sm text-gray-400">Expand your travel catalog</p>
              </div>
           </div>
        </Link>
      </div>
    </div>
  );
}
