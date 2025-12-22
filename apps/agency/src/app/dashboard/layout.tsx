'use client';

import React from 'react';
import { AgencySidebar } from '../../components/layout/AgencySidebar';
import { AgencyNavbar } from '../../components/layout/AgencyNavbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-off-white overflow-hidden">
      {/* Sidebar */}
      <AgencySidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AgencyNavbar />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
