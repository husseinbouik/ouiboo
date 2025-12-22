'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Map, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Trips', href: '/dashboard/trips', icon: Map },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function AgencySidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-deep-blue rounded-lg flex items-center justify-center text-white font-bold">O</div>
          <span className="text-xl font-bold text-deep-blue">Ouiboo</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-deep-blue text-white shadow-md shadow-blue-900/10" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-deep-blue"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                isActive ? "text-white" : "text-gray-400 group-hover:text-deep-blue"
              )} />
              {item.name}
              {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          );
        })}

        <div className="pt-4">
          <Link
            href="/dashboard/trips/create"
            className="flex items-center px-3 py-2 text-sm font-semibold text-sunset-orange bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <PlusCircle className="mr-3 h-5 w-5" />
            Create New Trip
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
