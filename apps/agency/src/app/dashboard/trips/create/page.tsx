'use client';

import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Plus, 
  Image as ImageIcon,
  Check,
  ChevronLeft,
  Info,
  Users
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';

export default function CreateTripPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-gray-500 hover:text-deep-blue transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <div className="flex gap-2">
           {Array.from({ length: totalSteps }).map((_, i) => (
             <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${i + 1 <= step ? "bg-deep-blue" : "bg-gray-200"}`}></div>
           ))}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-deep-blue">Create a New Adventure</h1>
        <p className="text-gray-500 mt-2">Fill in the details below to publish your trip to the marketplace.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {step === 1 && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                   <Info className="h-5 w-5 text-sunset-orange" />
                   Basic Information
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Trip Title</label>
                    <Input placeholder="e.g. 5 Days in the Sahara Desert" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <textarea 
                      className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 focus:border-deep-blue transition-all"
                      placeholder="Describe the unique experience travelers will have..."
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Category</label>
                      <select className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 transition-all">
                        <option>Adventure</option>
                        <option>Cultural</option>
                        <option>Luxury</option>
                        <option>Budget</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Group Size</label>
                      <Input type="number" placeholder="Max people" className="h-12" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                   <MapPin className="h-5 w-5 text-sunset-orange" />
                   Location & Duration
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Starting Location</label>
                    <Input placeholder="e.g. Marrakech, Morocco" className="h-12" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Duration (Days)</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input type="number" className="h-12 pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Duration (Nights)</label>
                      <Input type="number" className="h-12" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                   <Plus className="h-5 w-5 text-sunset-orange" />
                   Inclusions & Exclusions
                </h2>
                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">What's Included</label>
                      <div className="flex gap-2">
                        <Input placeholder="e.g. Traditional Lunch" className="h-12 flex-1" />
                        <Button className="h-12 px-6 bg-deep-blue hover:bg-blue-900 border-none">Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {['Transport', 'Lunch', 'Guide'].map(item => (
                          <span key={item} className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                            <Check className="h-3 w-3" /> {item}
                          </span>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                   <ImageIcon className="h-5 w-5 text-sunset-orange" />
                   Media & Photos
                </h2>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-4 bg-gray-50/50 hover:bg-gray-50 hover:border-sunset-orange/50 transition-all cursor-pointer group">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-8 w-8 text-gray-400 group-hover:text-sunset-orange" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Click to upload photos</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, up to 10MB each</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={step === 1}
              className="px-8 h-12"
            >
              Previous
            </Button>
            <Button 
              onClick={step === totalSteps ? undefined : nextStep}
              className="px-10 h-12 bg-sunset-orange hover:bg-orange-600 border-none shadow-lg shadow-orange-900/20"
            >
              {step === totalSteps ? 'Publish Trip' : 'Continue'}
            </Button>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="hidden lg:block">
           <div className="sticky top-24 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</p>
              <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
                 <div className="relative h-48 bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                       <ImageIcon className="h-12 w-12" />
                    </div>
                 </div>
                 <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                       <div className="h-4 w-24 bg-gray-100 rounded"></div>
                       <div className="h-6 w-full bg-gray-100 rounded"></div>
                    </div>
                    <div className="flex items-center gap-4 py-4 border-y border-gray-50">
                       <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="h-3 w-12 bg-gray-100 rounded"></div>
                       </div>
                       <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div className="h-3 w-12 bg-gray-100 rounded"></div>
                       </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="h-6 w-24 bg-gray-100 rounded"></div>
                       <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    </div>
  );
}
