'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, Button } from '@ouiboo/ui';
import { MapPin, Star, ChevronLeft, ChevronRight, Zap, ShieldCheck, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency } from '@ouiboo/utils';
import { SessionStatus, type SessionStatusType, VerificationStatus, type VerificationStatusType } from '@ouiboo/types';
import { WishlistButton } from './WishlistButton';

export interface TripCardTrip {
  id: string;
  title: string;
  category?: string;
  startLocation?: string;
  durationDays?: number;
  images?: string[];
  averageRating?: number | null;
  reviewCount?: number;
  sessions?: Array<{
    id: string;
    status: SessionStatusType | string;
    availableSeats: number;
    price: number | string;
    startDate: string;
  }>;
  agency?: {
    verificationStatus?: VerificationStatusType;
  } | null;
}

interface TripCardProps {
  trip: TripCardTrip;
}

export function TripCard({ trip }: TripCardProps) {
  const { t, i18n } = useTranslation();
  const [currentImage, setCurrentImage] = useState(0);
  const images = trip.images && trip.images.length > 0 
    ? trip.images 
    : ['https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'];
  const sessions = trip.sessions || [];
  const openSessions = sessions.filter(
    (session) => session.status === SessionStatus.Open && session.availableSeats > 0
  );
  const nextSession = [...openSessions].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  })[0];
  const minPrice = sessions.length
    ? Math.min(...sessions.map((session) => Number(session.price || 0)))
    : null;
  const isAgencyVerified = trip.agency?.verificationStatus === VerificationStatus.Verified;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card className="group border-border shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-card h-full flex flex-col">
      <div className="relative h-64 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentImage]}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={trip.title}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
          </motion.div>
        </AnimatePresence>
        
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              aria-label={t('tripCard.previousImage')}
              className="absolute start-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button 
              onClick={nextImage}
              aria-label={t('tripCard.nextImage')}
              className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </>
        )}

        {/* Indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_: string, i: number) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                currentImage === i ? "w-6 bg-white" : "w-1.5 bg-white/60"
              )} 
            />
          ))}
        </div>

        <div className="absolute top-3 start-3">
          <Badge className="bg-card/95 text-foreground text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none">
            {trip.category || t('tripCard.defaultCategory')}
          </Badge>
        </div>

        <div className="absolute top-3 end-14 flex flex-col items-end gap-2">
          <Badge className="bg-card/95 text-foreground text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none flex items-center gap-1">
            <Ticket className="h-3 w-3" />
            {minPrice !== null ? formatCurrency(minPrice, undefined, i18n.language) : t('tripCard.priceTba')}
          </Badge>
          <Badge className={cn(
            "text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none flex items-center gap-1",
            nextSession ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
          )}>
            <Zap className="h-3 w-3" />
            {nextSession ? t('tripCard.spots', { count: nextSession.availableSeats }) : t('tripCard.soldOut')}
          </Badge>
        </div>

          <WishlistButton tripId={trip.id} className="absolute top-3 end-3" />
      </div>

      <Link href={`/trip/${trip.id}`} className="flex-1 flex flex-col p-6">
        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-start gap-3">
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">{trip.title}</h3>
            <div className="flex items-center gap-1 shrink-0 bg-warning/10 px-2 py-0.5 rounded-md">
              <Star className={cn("h-3.5 w-3.5 text-warning", trip.reviewCount ? "fill-warning" : "fill-none")} />
              <span className="text-xs font-bold text-warning">
                {trip.reviewCount ? Number(trip.averageRating || 0).toFixed(1) : t('tripCard.new')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(
              "border-none text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
              isAgencyVerified ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}>
              <ShieldCheck className="h-3 w-3" />
              {isAgencyVerified ? t('tripCard.verifiedAgency') : t('tripCard.agencyPending')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {trip.startLocation}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {trip.durationDays ? t('tripCard.days', { count: trip.durationDays }) : ''}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('tripCard.from')}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">
                   {minPrice !== null ? formatCurrency(minPrice, undefined, i18n.language) : '---'}
                </span>
            </div>
          </div>
          <Button size="sm" className="rounded-xl px-4 py-2 h-auto text-sm font-semibold bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-none hover:shadow-md">
            {t('tripCard.viewDetails')}
          </Button>
        </div>
      </Link>
    </Card>
  );
}

