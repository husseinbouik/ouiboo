'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge,
  Button
} from '@ouiboo/ui';
import { 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stats = [
  { 
    label: 'Available Balance', 
    value: '12,450.00', 
    currency: 'MAD', 
    icon: Wallet, 
    color: 'bg-emerald-500',
    trend: '+12.5%',
    trendUp: true
  },
  { 
    label: 'Pending Escrow', 
    value: '4,800.00', 
    currency: 'MAD', 
    icon: Clock, 
    color: 'bg-amber-500',
    trend: '3 bookings',
    trendUp: null
  },
  { 
    label: 'Total Withdrawals', 
    value: '45,200.00', 
    currency: 'MAD', 
    icon: TrendingUp, 
    color: 'bg-slate-500',
    trend: 'Last: 2 days ago',
    trendUp: false
  },
];

const mockBookings = [
  { id: '1', trip: 'Sahara Starry Night', customer: 'Hussein B.', date: '2024-05-12', amount: '1,200.00', status: 'Confirmed' },
  { id: '2', trip: 'Atlas Mountain Hike', customer: 'Sarah M.', date: '2024-05-14', amount: '850.00', status: 'Pending Verification' },
  { id: '3', trip: 'Chefchaouen Day Trip', customer: 'Anas K.', date: '2024-05-15', amount: '450.00', status: 'Pending Verification' },
  { id: '4', trip: 'Dakhla Surf Camp', customer: 'Elena R.', date: '2024-05-16', amount: '3,500.00', status: 'Confirmed' },
];

export default function AgencyDashboard() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-12 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight">Bonjour, Sunset Travels</h1>
          <p className="text-muted-foreground font-medium mt-1">Here's what's happening with your agency today.</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl font-bold h-12 px-6 gap-2">
                <Calendar className="h-4 w-4" /> This Month
            </Button>
            <Button className="rounded-xl font-black h-12 px-8 bg-primary">Withdraw Funds</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label} 
            variants={fadeInUp} 
            initial="initial" 
            animate="animate" 
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                  {stat.trendUp !== null && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-black rounded-full px-3 py-1",
                        stat.trendUp ? "text-emerald-600 bg-emerald-50" : "text-slate-600 bg-slate-50"
                    )}>
                        {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {stat.trend}
                    </div>
                  )}
                  {stat.trendUp === null && (
                     <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {stat.trend}
                     </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                  <h3 className="text-4xl font-black font-display tracking-tighter">
                    {stat.value} <span className="text-sm font-bold text-muted-foreground">{stat.currency}</span>
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><AlertCircle className="h-5 w-5 text-primary" /></div>
              <h2 className="text-2xl font-black font-display tracking-tight">Recent Bookings</h2>
           </div>
           <Button variant="ghost" className="font-bold text-primary gap-2 rounded-xl group">
             View All <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
           </Button>
        </div>

        <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none h-16">
                  <TableHead className="pl-10 font-bold uppercase text-[10px] tracking-widest">Trip</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Customer</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Amount</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Status</TableHead>
                  <TableHead className="pr-10 text-right font-bold uppercase text-[10px] tracking-widest">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockBookings.map((booking) => (
                  <TableRow key={booking.id} className="h-24 hover:bg-muted/20 border-border/30">
                    <TableCell className="pl-10">
                      <div>
                        <p className="font-black text-foreground text-md leading-none mb-1">{booking.trip}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Booking ID: #{booking.id}B</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-foreground/80">{booking.customer}</TableCell>
                    <TableCell>
                        <p className="text-sm font-medium text-muted-foreground">{booking.date}</p>
                    </TableCell>
                    <TableCell className="text-right">
                        <span className="font-black text-foreground">{booking.amount}</span>
                        <span className="text-[10px] ml-1 font-bold text-muted-foreground uppercase">MAD</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        className={cn(
                          "rounded-full px-4 py-1.5 font-black uppercase text-[9px] tracking-widest border-none shadow-sm",
                          booking.status === 'Confirmed' 
                            ? "bg-emerald-500/10 text-emerald-600" 
                            : "bg-amber-500/10 text-amber-600"
                        )}
                      >
                        {booking.status === 'Confirmed' ? <CheckCircle2 className="h-3 w-3 mr-1.5 inline" /> : <Clock className="h-3 w-3 mr-1.5 inline" />}
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-10 text-right">
                      <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 hover:bg-primary hover:text-white transition-all">
                        <Eye className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-primary rounded-[3rem] p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between text-white shadow-2xl shadow-primary/20">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
         <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
            <h3 className="text-3xl font-black font-display tracking-tight leading-none">Ready to expand your reach?</h3>
            <p className="text-white/80 font-medium text-lg leading-relaxed">Publish more trips and get verified to access higher withdrawal limits and premium placements.</p>
         </div>
         <Link href="/trips/new" className="relative z-10 mt-8 md:mt-0">
            <Button className="h-20 px-12 rounded-[2rem] bg-white text-primary hover:bg-slate-100 font-black text-xl border-none shadow-2xl transition-all hover:scale-105 active:scale-95">
                Create New Trip
            </Button>
         </Link>
      </div>
    </div>
  );
}
