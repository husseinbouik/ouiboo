import Link from 'next/link';
import { Search, MapPin, Calendar, Users, Star, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';

async function getFeaturedTrips() {
  try {
    const response = await apiClient.get('/trips?featured=true');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch featured trips:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredTrips = await getFeaturedTrips();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?q=80&w=2070&auto=format&fit=crop" 
            alt="Hero Background" 
            className="w-full h-full object-cover brightness-[0.7]"
          />
        </div>
        
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Discover Morocco's <br />
            <span className="text-sunset-orange">Hidden Gems</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 max-w-2xl mx-auto">
            Book unique adventures curated by local experts. Experience authentic Moroccan culture like never before.
          </p>
          
          {/* Search Bar */}
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl shadow-2xl max-w-3xl mx-auto flex flex-col md:flex-row gap-2 border border-white/20">
            <div className="flex-1 flex items-center px-4 py-3 bg-white rounded-xl">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Where to?" 
                className="bg-transparent border-none focus:outline-none text-gray-900 w-full"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 bg-white rounded-xl">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="When?" 
                className="bg-transparent border-none focus:outline-none text-gray-900 w-full"
              />
            </div>
            <Button className="bg-sunset-orange hover:bg-orange-600 border-none px-8 h-full py-4 rounded-xl font-bold text-lg">
              <Search className="h-5 w-5 mr-2" /> Search
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Trips */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-deep-blue mb-2">Editor's Choice</h2>
              <p className="text-gray-600 text-lg">Specially curated adventures for unforgettable memories.</p>
            </div>
            <Link href="/search" className="text-sunset-orange font-bold flex items-center gap-1 hover:underline">
              View all trips <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredTrips.length > 0 ? (
              featuredTrips.map((trip: any) => (
                <Link key={trip.id} href={`/trip/${trip.id}`}>
                  <Card className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden bg-white">
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={trip.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={trip.title}
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-deep-blue text-xs font-bold rounded-full uppercase">
                          {trip.category}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-deep-blue line-clamp-1">{trip.title}</h3>
                        <div className="flex items-center text-sunset-orange">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-bold ml-1">4.9</span>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{trip.startLocation}</span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{trip.durationDays} Days</span>
                          </div>
                   
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block uppercase font-bold">From</span>
                          <span className="text-xl font-black text-deep-blue">{trip.sessions?.[0]?.price || '---'} MAD</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
                [1,2,3].map(i => (
                  <div key={i} className="animate-pulse space-y-4">
                    <div className="bg-gray-200 h-64 rounded-2xl w-full"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-deep-blue mb-12 text-center">Find Your Adventure Type</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {['Adventure', 'Cultural', 'Luxury', 'Budget'].map(cat => (
              <div key={cat} className="group relative h-40 rounded-2xl overflow-hidden cursor-pointer">
                <img 
                  src={`https://images.unsplash.com/photo-1548013146-72479768bbaa?q=80&w=2070&auto=format&fit=crop`} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                  alt={cat}
                />
                <div className="absolute inset-0 bg-deep-blue/40 group-hover:bg-deep-blue/60 transition-colors flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{cat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
