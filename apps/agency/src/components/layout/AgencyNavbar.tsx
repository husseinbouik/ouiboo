'use client';

import { Bell, Search, User } from 'lucide-react';

export function AgencyNavbar() {
  return (
    <header className="h-16 bg-white border-bottom border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search trips, bookings..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 focus:border-deep-blue transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg relative transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sunset-orange rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        <button className="flex items-center gap-3 p-1 pr-3 hover:bg-gray-50 rounded-lg transition-colors group">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-deep-blue font-bold text-xs border border-deep-blue/10">
            JS
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-deep-blue transition-colors">John Smith</p>
            <p className="text-xs text-gray-500">Global Travels Ltd.</p>
          </div>
        </button>
      </div>
    </header>
  );
}
