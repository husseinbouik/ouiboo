'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, Badge } from '@ouiboo/ui';
import { CheckCircle2, ShieldCheck, Clock, UploadCloud } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';

export default function CheckoutConfirmationPage() {
  const searchParams = useSearchParams();
  const isProofUploaded = searchParams.get('proof') === '1';
  const bookingId = searchParams.get('bookingId');

  const statusItems = [
    {
      title: 'Pending payment',
      description: 'Your transfer is marked as pending until our team reviews it.',
      icon: Clock,
      state: isProofUploaded ? 'complete' : 'active'
    },
    {
      title: 'Payment proof uploaded',
      description: 'We have received your receipt and attached it to the booking.',
      icon: UploadCloud,
      state: isProofUploaded ? 'complete' : 'pending'
    },
    {
      title: 'Agency verification',
      description: 'The agency will confirm availability and validate the payment.',
      icon: ShieldCheck,
      state: 'pending'
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30 pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div className="text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-[2rem] bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <Badge className="mx-auto bg-emerald-500/10 text-emerald-700 border-none px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest">
                Booking submitted
              </Badge>
              <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Thanks! Your booking is being processed.</h1>
              <p className="text-muted-foreground font-medium text-lg">
                We will notify you once the agency confirms the payment and availability.
              </p>
              {bookingId && (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Booking reference: {bookingId}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-foreground">Confirmation status</p>
              <div className="space-y-3">
                {statusItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={cn(
                        "flex items-start gap-4 rounded-[2rem] border p-5",
                        item.state === 'complete' ? "border-emerald-200 bg-emerald-50" : "border-border/60 bg-muted/20"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-2xl flex items-center justify-center",
                          item.state === 'complete' ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground">{item.title}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/bookings" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] bg-deep-blue dark:bg-slate-900 text-white font-black">
                  View my bookings
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] font-black">
                  Back to home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
