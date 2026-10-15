'use client';

import React from 'react';
import Image from 'next/image';
import { Users, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card, Badge, Pagination } from '@ouiboo/ui';
import { VerificationStatus, type VerificationStatusType } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminAgency } from './types';
import { getAdminVerificationBadgeClass, getAdminVerificationBadgeLabel, getAdminSubscriptionBadgeLabel } from '../../app/status-mappers';
import { canApproveAgency, canRejectAgency } from './formatters';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type AgenciesTabProps = {
  t: TFn;
  agencies: AdminAgency[];
  pagination: PaginationMeta | null;
  onPageChange: (page: number) => void;
  paginationLabels: {
    showing: string;
    of: string;
    pagination: string;
    previousPage: string;
    nextPage: string;
    goToPage: (page: number) => string;
  };
  onSelectAgency: (agency: AdminAgency) => void;
  onUpdateAgencyStatus: (id: string, status: VerificationStatusType) => void;
};

export default function AgenciesTab({
  t,
  agencies,
  pagination,
  onPageChange,
  paginationLabels,
  onSelectAgency,
  onUpdateAgencyStatus,
}: AgenciesTabProps) {
  return (
<div className="space-y-6 animate-in fade-in duration-500">
  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
     <Users className="h-5 w-5 text-sunset-orange" />
     {t('dashboard.sections.agencies')} ({pagination?.total ?? agencies.length})
  </h2>
  <div className="grid grid-cols-1 gap-4">
     {agencies.map((agency) => (
        <Card key={agency.id} className="border-none shadow-sm p-6 bg-card overflow-hidden">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 bg-muted rounded-xl overflow-hidden">
                    <Image src={agency.logo || `https://ui-avatars.com/api/?name=${agency.companyName}`} alt={t('dashboard.labels.agencyLogo', { name: agency.companyName })} width={48} height={48} className="h-full w-full object-cover" />
                 </div>
                 <div>
                    <h3 className="font-bold text-foreground">{agency.companyName}</h3>
                    <div className="flex gap-2">
                       <Badge className={getAdminVerificationBadgeClass(agency.verificationStatus)}>{getAdminVerificationBadgeLabel(agency.verificationStatus, t)}</Badge>
                       <Badge variant="outline">{getAdminSubscriptionBadgeLabel(agency.subscriptionStatus, t)}</Badge>
                    </div>
                 </div>
              </div>
              <div className="flex gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => {
                     onSelectAgency(agency);
                   }}
                 >
                   <Eye className="h-4 w-4 ms-2" />
                   {t('dashboard.actions.view')}
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => onUpdateAgencyStatus(agency.id, agency.verificationStatus === VerificationStatus.Verified ? VerificationStatus.Rejected : VerificationStatus.Verified)}>
                    {agency.verificationStatus === VerificationStatus.Verified ? t('dashboard.actions.deactivate') : t('dashboard.actions.activate')}
                 </Button>
              </div>
           </div>
</Card>
      ))}
  </div>
  <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
</div>
  );
}
