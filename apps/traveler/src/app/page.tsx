import { apiClient } from '@/lib/api-client';
import HomeClient from './HomeClient';

async function getFeaturedTrips() {
  try {
    let response = await apiClient.get('/trips?featured=true&status=ACTIVE');
    if (response.data.length === 0) {
      response = await apiClient.get('/trips?status=ACTIVE');
    }
    return response.data;
  } catch (error) {
    console.error('Failed to fetch featured trips:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredTrips = await getFeaturedTrips();

  return <HomeClient featuredTrips={featuredTrips} />;
}
