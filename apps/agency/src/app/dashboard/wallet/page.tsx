'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button,
  Badge
} from '@ouiboo/ui';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  History
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function WalletPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['agency-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    }
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['agency-payouts'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/payouts');
      return response.data;
    }
  });

  const wallet = statsData?.wallet || { availableBalance: 0, pendingBalance: 0 };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-deep-blue">Wallet & Payouts</h1>
        <p className="text-gray-500 mt-1">Manage your earnings and request payouts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <Card className="border-none shadow-lg bg-deep-blue text-white relative overflow-hidden">
          <CardContent className="p-8 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-white/10 p-2 rounded-lg text-white">
                <WalletIcon className="h-6 w-6" />
              </div>
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Cleared</Badge>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium">Available Balance</p>
              <h2 className="text-4xl font-bold mt-1">
                {wallet.availableBalance.toLocaleString()} <span className="text-lg font-normal">MAD</span>
              </h2>
            </div>
            <Button className="w-full bg-sunset-orange hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-900/20 font-bold py-6">
              Withdraw Funds <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sunset-orange/10 rounded-full blur-3xl"></div>
        </Card>

        {/* Pending Balance */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px]">In Escrow</Badge>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending Balance</p>
              <h2 className="text-4xl font-bold text-deep-blue mt-1 font-heading">
                {wallet.pendingBalance.toLocaleString()} <span className="text-lg font-normal text-gray-400">MAD</span>
              </h2>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed italic border-t pt-4">This amount is held in escrow until trips are completed and verified by travelers.</p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-deep-blue">Monthly Growth</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-semibold text-deep-blue">{statsData?.revenue?.toLocaleString() || 0} MAD</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Wait Time</span>
                <span className="font-semibold text-deep-blue">~48 Hours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Recent transfers to your registered RIB</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">Export CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold">Reference</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading || payoutsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center">Loading transactions...</td>
                  </tr>
                ) : payouts?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No payout history yet.</td>
                  </tr>
                ) : payouts?.map((payout: any) => (
                  <tr key={payout.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-deep-blue underline decoration-dotted underline-offset-4 cursor-pointer text-xs">
                      {payout.id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 text-base">
                      {payout.amount.toLocaleString()} MAD
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {payout.status === 'PAID' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {payout.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-500" />}
                        {payout.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full uppercase",
                          payout.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 
                          payout.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        )}>
                          {payout.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {new Date(payout.requestedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-900">How do payouts work?</h4>
          <p className="text-sm text-blue-700 mt-1 leading-relaxed">
            When a traveler books a trip, the money is held in <strong>Escrow</strong> (Pending Balance). 
            Funds are moved to your <strong>Available Balance</strong> 24 hours after the trip is completed. 
            Once in Available Balance, you can request a withdrawal to your registered RIB.
          </p>
        </div>
      </div>
    </div>
  );
}
