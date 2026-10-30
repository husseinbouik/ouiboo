import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { VerificationStatus, type VerificationStatusType } from '@ouiboo/types';
import { getServerTranslations } from '@/lib/server-translations';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import SellerIdentity from '@/components/SellerIdentity';
import VerificationRecord from '@/components/VerificationRecord';
import SellerBlock from '@/components/SellerBlock';
import AgencyStorefront, { type StorefrontData } from '@/components/AgencyStorefront';

interface AgencyPublicProfile {
  id: string;
  companyName: string;
  bio: string | null;
  logo: string | null;
  verificationStatus: VerificationStatusType;
  // #371: seller-of-record fields from GET /agencies/:id/public
  legalName?: string | null;
  licenceVerified?: boolean;
  travelLicenceNumber?: string | null;
  // #673 (Council S6): dated verification statements — licence status,
  // expiry and verified-at; insurance status and verified-at. These ride
  // through to SellerIdentity, which renders them with their dates.
  travelLicenceType?: string | null;
  travelLicenceStatus?: string | null;
  licenceExpiry?: string | null;
  licenceIssuedAt?: string | null;
  licenceIssuingAuthority?: string | null;
  licenceVerifiedAt?: string | null;
  insuranceStatus?: string | null;
  insuranceVerifiedAt?: string | null;
  // #688/#700 (Council S6): the derived Public Verification Record and
  // the Law 31-08 seller-block facts from GET /agencies/:id/public.
  insuranceInsurer?: string | null;
  insuranceExpiry?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  rc?: string | null;
  taxId?: string | null;
  // #691: the storefront block from GET /agencies/:id/public.
  storefront?: StorefrontData | null;
  verificationRecord?: {
    legalName?: string | null;
    licenceNumber?: string | null;
    licenceType?: string | null;
    issuingAuthority?: string | null;
    licenceExpiry?: string | null;
    licenceStatus?: string | null;
    insurer?: string | null;
    insuranceValidFrom?: string | null;
    insuranceExpiry?: string | null;
    insuranceStatus?: string | null;
    checkedOn?: string | null;
    status?: string | null;
    tripsPaused?: boolean;
  } | null;
}

interface Trip {
  id: string;
  title: string;
  description: string;
  images: string[];
  imageAlts?: string[];
  durationDays: number;
  startLocation: string;
  sessions: Array<{
    id: string;
  }>;
}

async function getAgency(id: string): Promise<AgencyPublicProfile | null> {
  try {
    const res = await apiClient.get(`/agencies/${id}/public`);
    return res.data;
  } catch {
    return null;
  }
}

async function getAgencyTrips(agencyId: string): Promise<Trip[]> {
  try {
    // #546: trip text in the visitor's language.
    const locale = await getInitialLanguage();
    const res = await apiClient.get(`/trips?agencyId=${agencyId}&status=ACTIVE&locale=${locale}`);
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function AgencyPage({ params }: { params: Promise<{ agencyId: string }> }) {
  const { agencyId } = await params;
  const { t } = await getServerTranslations();
  const locale = await getInitialLanguage();
  const agency = await getAgency(agencyId);
  const trips = await getAgencyTrips(agencyId);

  if (!agency) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-24 text-foreground">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-12 text-center">
            {agency.logo ? (
                 <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden border-4 border-card shadow-lg">
                    <Image 
                        src={agency.logo} 
                        alt={agency.companyName} 
                        fill 
                        className="object-cover"
                    />
                 </div>
            ) : (
                <div className="w-32 h-32 mb-4 rounded-full bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground">
                    {agency.companyName.charAt(0)}
                </div>
            )}
            
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                {agency.companyName}
                {agency.verificationStatus === VerificationStatus.Verified && (
                    <span className="text-ocean-500" title={t('agency.verifiedTitle')}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </span>
                )}
            </h1>
            {agency.bio && <p className="text-muted-foreground max-w-2xl">{agency.bio}</p>}
            {/* #371: seller of record + verified travel licence */}
            <SellerIdentity agency={agency} className="mt-4" />
            {/* #688 (Council S6): the Public Verification Record — the
                canonical, checkable record this page anchors at
                #verification-record (linked from trips, checkout and
                bookings). Metadata only; documents stay private. */}
            <VerificationRecord agency={agency} className="mt-6 w-full max-w-2xl text-left" />
            {/* #700: the Art. 29(2) seller block facts. */}
            <SellerBlock agency={agency} className="mt-4 w-full max-w-2xl text-left" />
            {/* #691 (Council S6): the shareable storefront — about,
                languages, live counts, response time, review aggregate
                (threshold rule), share link + QR. */}
            {agency.storefront && <AgencyStorefront storefront={agency.storefront} locale={locale} />}
            {/* #681 (Council S6): this page publishes no agency-level
                rating average. Trip ratings follow the same threshold
                rule everywhere: counts always show, averages only from
                5 reviews, and reviews come only from completed trips. */}
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{t('agency.reviewsPolicy')}</p>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.length > 0 ? (
                trips.map((trip) => (
                    <a key={trip.id} href={`/trip/${trip.id}`} className="group block bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-border">
                        <div className="relative aspect-[4/3]">
                            {trip.images[0] ? (
                                <Image src={trip.images[0]} alt={trip.imageAlts?.[0]?.trim() || trip.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <div className="w-full h-full bg-muted" />
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{trip.title}</h3>
                            <div className="flex items-center text-sm text-muted-foreground gap-4">
                                <span>{t('tripCard.days', { count: trip.durationDays })}</span>
                                <span>/</span>
                                <span>{trip.startLocation}</span>
                            </div>
                        </div>
                    </a>
                ))
            ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                    {t('agency.noTrips')}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

