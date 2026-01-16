import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { VerificationStatus, type VerificationStatusType } from '@ouiboo/types';

interface AgencyPublicProfile {
  id: string;
  companyName: string;
  bio: string | null;
  logo: string | null;
  verificationStatus: VerificationStatusType;
}

interface Trip {
  id: string;
  title: string;
  description: string;
  images: string[];
  durationDays: number;
  startLocation: string;
  sessions: any[];
}

async function getAgency(id: string): Promise<AgencyPublicProfile | null> {
  try {
    const res = await apiClient.get(`/agencies/${id}/public`);
    return res.data;
  } catch (error) {
    return null;
  }
}

async function getAgencyTrips(agencyId: string): Promise<Trip[]> {
  try {
    const res = await apiClient.get(`/trips?agencyId=${agencyId}&status=ACTIVE`);
    return res.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function AgencyPage({ params }: { params: { agencyId: string } }) {
  const agency = await getAgency(params.agencyId);
  const trips = await getAgencyTrips(params.agencyId);

  if (!agency) {
    notFound();
  }

  return (
    <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="flex flex-col items-center mb-12 text-center">
            {agency.logo ? (
                 <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <Image 
                        src={agency.logo} 
                        alt={agency.companyName} 
                        fill 
                        className="object-cover"
                    />
                 </div>
            ) : (
                <div className="w-32 h-32 mb-4 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-400">
                    {agency.companyName.charAt(0)}
                </div>
            )}
            
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                {agency.companyName}
                {agency.verificationStatus === VerificationStatus.Verified && (
                    <span className="text-blue-500" title="Verified Agency">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </span>
                )}
            </h1>
            {agency.bio && <p className="text-gray-600 max-w-2xl">{agency.bio}</p>}
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.length > 0 ? (
                trips.map((trip) => (
                    <a key={trip.id} href={`/trip/${trip.id}`} className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
                        <div className="relative aspect-[4/3]">
                            {trip.images[0] ? (
                                <Image src={trip.images[0]} alt={trip.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <div className="w-full h-full bg-gray-100" />
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">{trip.title}</h3>
                            <div className="flex items-center text-sm text-gray-500 gap-4">
                                <span>{trip.durationDays} Days</span>
                                <span>•</span>
                                <span>{trip.startLocation}</span>
                            </div>
                        </div>
                    </a>
                ))
            ) : (
                <div className="col-span-full text-center py-12 text-gray-500">
                    No active trips found for this agency.
                </div>
            )}
        </div>
    </div>
  );
}
