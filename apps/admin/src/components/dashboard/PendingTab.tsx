'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck, MapPin, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card, CardContent, Badge, Pagination } from '@ouiboo/ui';
import { TripStatus, VerificationStatus, type VerificationStatusType, type TripStatusType } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminAgency, AdminTrip, FeedbackState } from './types';
import { getAdminVerificationBadgeClass, getAdminVerificationBadgeLabel, getAdminSubscriptionBadgeLabel } from '../../app/status-mappers';
import { canApproveAgency, canRejectAgency, canApproveTrip, canRejectTrip } from './formatters';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type PendingTabProps = {
  t: TFn;
  pendingAgencies: AdminAgency[];
  pendingAgenciesPagination: PaginationMeta | null;
  pendingTrips: AdminTrip[];
  pendingTripsPagination: PaginationMeta | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  paginationLabels: {
    showing: string;
    of: string;
    pagination: string;
    previousPage: string;
    nextPage: string;
    goToPage: (page: number) => string;
  };
  agencyFeedback: FeedbackState | null;
  onSelectAgency: (agency: AdminAgency) => void;
  onVerifyAgency: (id: string, status: VerificationStatusType) => void;
  isVerifyingAgency: boolean;
  onVerifyTrip: (id: string, status: string) => void;
  isVerifyingTrip: boolean;
};

export default function PendingTab({
  t,
  pendingAgencies,
  pendingAgenciesPagination,
  pendingTrips,
  pendingTripsPagination,
  currentPage,
  onPageChange,
  paginationLabels,
  agencyFeedback,
  onSelectAgency,
  onVerifyAgency,
  isVerifyingAgency,
  onVerifyTrip,
  isVerifyingTrip,
}: PendingTabProps) {
  return (
<div className="space-y-12">
   <section className="space-y-6">
<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-sunset-orange" />
          {t('dashboard.sections.pendingAgencies')} ({pendingAgenciesPagination?.total ?? pendingAgencies.length})
       </h2>
      <div className="grid grid-cols-1 gap-4">
         {pendingAgencies.map((agency) => (
        (() => {
          const canApprove = canApproveAgency(agency.verificationStatus);
          const canReject = canRejectAgency(agency.verificationStatus);
          return (
        <Card key={agency.id} className="border-none shadow-sm rounded-2xl p-6 bg-card overflow-hidden">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center overflow-hidden">
                        <Image src={agency.logo || `https://ui-avatars.com/api/?name=${agency.companyName}&background=F3F4F6&color=0A192F`} alt={t('dashboard.labels.agencyLogo', { name: agency.companyName })} width={64} height={64} className="h-full w-full object-cover" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-foreground">{agency.companyName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('dashboard.labels.ice')}: {agency.ice} - {t('dashboard.labels.joined')} {agency.user?.createdAt ? new Date(agency.user.createdAt).toLocaleDateString() : t('dashboard.labels.na')}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <Button
                       variant="outline"
                       className="border-border"
                       onClick={() => {
                         onSelectAgency(agency);
                       }}
                     >
                       <Eye className="h-4 w-4 ms-2" />
                       {t('dashboard.actions.review')}
                     </Button>
                     <Button
                       className="bg-danger/10 text-danger hover:bg-danger/15 border-none px-6 font-bold"
                       onClick={() => onVerifyAgency(agency.id, VerificationStatus.Rejected)}
                       disabled={!canReject || isVerifyingAgency}
                     >
                       {t('dashboard.actions.reject')}
                     </Button>
                     <Button
                       className="bg-success text-success-foreground hover:bg-success/90 border-none px-6 font-bold"
                       onClick={() => onVerifyAgency(agency.id, VerificationStatus.Verified)}
                       disabled={!canApprove || isVerifyingAgency}
                     >
                       {t('dashboard.actions.approve')}
                     </Button>
                  </div>
               </div>
            </Card>
);
        })()
         ))}
      </div>
      <Pagination pagination={pendingAgenciesPagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
   </section>

   <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-sunset-orange" />
          {t('dashboard.sections.tripQualityReview')} ({pendingTripsPagination?.total ?? pendingTrips.length})
       </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {pendingTrips.map((trip) => {
           const canApprove = canApproveTrip(trip.status);
           const canReject = canRejectTrip(trip.status);
           return (
              <Card key={trip.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
                 <div className="h-32 relative">
                    <Image src={trip.images?.[0] || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" alt={trip.title} fill sizes="(min-width: 1024px) 25vw, 100vw" />
                 </div>
                 <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                       <h3 className="font-bold text-foreground line-clamp-1">{trip.title}</h3>
                       <p className="text-xs text-muted-foreground">{trip.agency.companyName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                        onClick={() => onVerifyTrip(trip.id, TripStatus.Archived)}
                        disabled={!canReject || isVerifyingTrip}
                      >
                        {t('dashboard.actions.reject')}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => onVerifyTrip(trip.id, TripStatus.Active)}
                        disabled={!canApprove || isVerifyingTrip}
                      >
                        {t('dashboard.actions.approve')}
                      </Button>
                    </div>
                 </CardContent>
              </Card>
           );
         })}
      </div>
      <Pagination pagination={pendingTripsPagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
   </section>
</div>
  );
}
