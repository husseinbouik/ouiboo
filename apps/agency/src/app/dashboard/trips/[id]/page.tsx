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
  AlertCircle
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
import Link from 'next/link';

const mockSessions = [
  { id: 'S1', startDate: '2025-01-01', endDate: '2025-01-05', price: 1200, totalSeats: 20, availableSeats: 5, status: 'OPEN' },
  { id: 'S2', startDate: '2025-01-10', endDate: '2025-01-14', price: 1100, totalSeats: 20, availableSeats: 12, status: 'OPEN' },
  { id: 'S3', startDate: '2025-01-20', endDate: '2025-01-24', price: 1300, totalSeats: 20, availableSeats: 0, status: 'CLOSED' },
];

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const [showAddSession, setShowAddSession] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-gray-500 hover:text-deep-blue transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" /> Edit Template
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100">
            <Trash className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trip Template Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
             <div className="h-48 bg-gray-200">
                <img src="https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop" alt="Trip" className="w-full h-full object-cover" />
             </div>
             <CardContent className="p-6 space-y-4">
                <div>
                   <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-sunset-orange border-sunset-orange/20 mb-2">Adventure</Badge>
                   <h1 className="text-2xl font-bold text-deep-blue">Marrakech Desert Adventure</h1>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" /> Marrakech, Morocco
                   </div>
                   <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" /> 5 Days / 4 Nights
                   </div>
                   <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4 text-gray-400" /> Max 20 guests per session
                   </div>
                </div>
                <div className="pt-4 border-t border-gray-50">
                   <p className="text-sm text-gray-500 leading-relaxed italic line-clamp-3">
                      Experience the magic of the Moroccan desert with camel treks, stargazing, and traditional Berber hospitality.
                   </p>
                </div>
             </CardContent>
          </Card>
          
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 space-y-2">
             <div className="flex items-center gap-2 text-blue-900 font-bold">
                <AlertCircle className="h-5 w-5" />
                <span>Verification Required</span>
             </div>
             <p className="text-sm text-blue-700 leading-relaxed">
                Your agency verification is pending. You can create templates and sessions, but they won't be visible to travelers until your profile is verified.
             </p>
             <Link href="/dashboard/onboarding" className="inline-block text-sm font-bold text-blue-900 underline mt-2">
                Check Verification Status
             </Link>
          </div>
        </div>

        {/* Scheduler / Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                 <CalendarIcon className="h-5 w-5 text-sunset-orange" />
                 Trip Scheduler
              </h2>
              <p className="text-sm text-gray-500 mt-1">Add dates and prices to your trip template.</p>
            </div>
            <Button 
              onClick={() => setShowAddSession(!showAddSession)} 
              className="bg-deep-blue hover:bg-blue-900 gap-2 shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> {showAddSession ? 'Cancel' : 'Add Session'}
            </Button>
          </div>

          {showAddSession && (
             <Card className="border-2 border-sunset-orange/20 shadow-xl animate-in slide-in-from-top-4 duration-300">
                <CardHeader>
                   <CardTitle>Schedule New Session</CardTitle>
                   <CardDescription>Input dates, price, and available seats for this specific trip occurrence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <Label htmlFor="startDate">Start Date</Label>
                         <Input id="startDate" type="date" className="h-11" />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="endDate">End Date</Label>
                         <Input id="endDate" type="date" className="h-11" />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="price">Price (per person)</Label>
                         <div className="relative">
                            <Input id="price" type="number" className="h-11 pr-12" placeholder="0.00" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 tracking-tighter">MAD</span>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="seats">Total Seats</Label>
                         <Input id="seats" type="number" className="h-11" placeholder="20" />
                      </div>
                   </div>
                   <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <Button variant="outline" onClick={() => setShowAddSession(false)}>Cancel</Button>
                      <Button className="bg-sunset-orange hover:bg-orange-600 px-8">Create Session</Button>
                   </div>
                </CardContent>
             </Card>
          )}

          <div className="space-y-4">
             {mockSessions.map((session) => (
                <Card key={session.id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group">
                   <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                         <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                               <h3 className="font-bold text-lg text-deep-blue">
                                  {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                                  {new Date(session.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                               </h3>
                               <Badge variant={session.status === 'OPEN' ? 'success' : 'destructive'} className="uppercase text-[10px]">
                                  {session.status}
                               </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                               <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                                  <Users className="h-4 w-4" /> {session.availableSeats} seats left
                               </span>
                               <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                               <span>Total: {session.totalSeats} seats</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-8 px-6 border-x border-gray-50">
                            <div className="text-center">
                               <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">Price</p>
                               <p className="font-bold text-xl text-deep-blue">{session.price} <span className="text-xs font-normal">MAD</span></p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Manage Guests</Button>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-deep-blue">
                               <MoreVertical className="h-5 w-5" />
                            </Button>
                         </div>
                      </div>
                   </CardContent>
                </Card>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
