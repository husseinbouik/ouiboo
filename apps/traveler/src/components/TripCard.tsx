'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, Button } from '@ouiboo/ui';
import { MapPin, Star, Heart, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@ouiboo/ui/utils';

interface TripCardProps {
  trip: any;
}

export function TripCard({ trip }: TripCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const images = trip.images && trip.images.length > 0 
    ? trip.images 
    : ['https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'];

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card className="group border-none shadow-none hover:shadow-2xl hover:shadow-black/5 transition-all duration-700 rounded-[2.5rem] overflow-hidden bg-muted/20 dark:bg-slate-900/40 ring-1 ring-border/50 h-full flex flex-col">
      <div className="relative h-72 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={images[currentImage]}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full object-cover"
            alt={trip.title}
          />
        </AnimatePresence>
        
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentImage === i ? "w-6 bg-white" : "w-1.5 bg-white/50"
              )} 
            />
          ))}
        </div>

        <div className="absolute top-4 left-4">
          <Badge className="bg-white/90 dark:bg-black/95 text-foreground dark:text-white text-[9px] font-black rounded-xl uppercase px-3 py-1.5 border-none shadow-lg tracking-widest">
            {trip.category || 'Adventure'}
          </Badge>
        </div>

        <button className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-sunset-orange transition-all hover:scale-110 shadow-lg">
          <Heart className="h-5 w-5" />
        </button>
      </div>

      <Link href={`/trip/${trip.id}`} className="flex-1 flex flex-col p-8">
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-xl font-black text-foreground group-hover:text-sunset-orange transition-colors line-clamp-2 font-display leading-tight">{trip.title}</h3>
            <div className="flex items-center gap-1 shrink-0 pt-1">
              <Star className="h-4 w-4 fill-sunset-orange text-sunset-orange" />
              <span className="text-sm font-black text-foreground">5.0</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground font-black uppercase text-[9px] tracking-widest">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-sunset-orange" /> {trip.startLocation}</span>
            <span>•</span>
            <span>{trip.durationDays} Days</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted-foreground tracking-[0.2em] font-black uppercase mb-1">Starting from</span>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground tracking-tighter">
                   {trip.sessions?.[0]?.price || '---'}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">MAD</span>
            </div>
          </div>
          <Button size="sm" className="rounded-xl px-5 h-10 font-black gap-2 bg-primary group-hover:bg-sunset-orange transition-colors">
            Book <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Link>
    </Card>
  );
}
