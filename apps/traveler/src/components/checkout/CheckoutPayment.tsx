'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@ouiboo/ui';
import { Calendar, Info, ShieldCheck, Banknote, UploadCloud, CheckCircle2, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';

type CheckoutPaymentProps = {
  bankDetails: string;
  hasBankDetails: boolean;
  proofPreview: string | null;
  onProofUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearProof: () => void;
  proofFile: File | null;
  isUploading: boolean;
};

export function CheckoutPayment({
  bankDetails,
  hasBankDetails,
  proofPreview,
  onProofUpload,
  onClearProof,
  proofFile,
  isUploading,
}: CheckoutPaymentProps) {
  return (
    <div className="space-y-8 pt-10 border-t">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">2</div>
        <h2 className="text-2xl font-black font-display">Bank Transfer</h2>
      </div>

      <div className={cn(
        "p-6 rounded-[2rem] border-2 space-y-4",
        hasBankDetails ? "border-primary/20 bg-primary/5" : "border-rose-200 bg-rose-50"
      )}>
        <div className="flex items-center gap-3">
          <Banknote className={cn("h-8 w-8", hasBankDetails ? "text-primary" : "text-rose-600")} />
          <div>
            <h4 className="font-black text-lg">Virement Bancaire</h4>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {hasBankDetails ? 'Use the verified instructions below' : 'Payment instructions unavailable'}
            </p>
          </div>
        </div>
        {hasBankDetails ? (
          <>
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Official Bank Instructions</span>
            </div>
            <div className="bg-card/70 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap break-all leading-relaxed">
              {bankDetails}
            </div>
            <div className="p-4 bg-amber-50 rounded-xl flex gap-3 items-center">
              <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                Payment proof is required within 24 hours of booking. Reservations without proof are canceled automatically.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold text-rose-700">
            Booking is temporarily unavailable. The agency must configure its bank details before accepting payments.
          </p>
        )}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-end">
          <p className="text-xs font-black text-foreground uppercase tracking-widest">3. Upload Proof of Payment</p>
          <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">Upload within 24h</Badge>
        </div>
        <label className="h-44 border-4 border-dashed border-muted rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group">
          <input type="file" className="hidden" onChange={onProofUpload} disabled={isUploading} accept="image/*,application/pdf" />
          <AnimatePresence mode="wait">
            {proofPreview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full p-4"
              >
                <Image src={proofPreview} className="w-full h-full object-cover rounded-xl" alt="Proof" fill sizes="(min-width: 1024px) 40vw, 100vw" unoptimized />
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <p className="text-white font-black text-xs">Change Photo</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onClearProof(); }}
                  className="absolute top-6 right-6 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Click to upload transfer receipt</span>
              </div>
            )}
          </AnimatePresence>
        </label>
        <p className="text-[10px] text-muted-foreground text-center font-medium italic">You can upload later from My Bookings. Reservations without proof are canceled after 24 hours.</p>
      </div>

      <div className="space-y-4 pt-6 border-t border-border/50">
        <p className="text-xs font-black text-foreground uppercase tracking-widest">Payment Status</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", proofFile ? "bg-success/100 text-white" : "bg-amber-500 text-white")}>
              {proofFile ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Pending payment</p>
              <p className="text-[10px] font-medium text-muted-foreground">We are waiting for your transfer to be initiated.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", proofFile ? "bg-success/100 text-white" : "bg-muted text-muted-foreground")}>
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Payment proof uploaded</p>
              <p className="text-[10px] font-medium text-muted-foreground">Upload your receipt to lock in your reservation.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Agency verification</p>
              <p className="text-[10px] font-medium text-muted-foreground">Confirmation is sent once the agency verifies your payment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
