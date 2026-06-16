import { strapi } from '@/lib/api/client';
import { MapPageClient, Location } from '@/components/map';

async function getAllLocations(): Promise<Location[]> {
  try {
    const response = await strapi.collection('locations').find<Location>({
      sort: 'createdAt:desc',
      pagination: { pageSize: 100 },
      populate: '*',
    });

    return response.data ?? [];
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return [];
  }
}

export default async function Home() {
  const locations = await getAllLocations();

  async function refetchLocations(): Promise<Location[]> {
    'use server';
    return getAllLocations();
  }

  return <MapPageClient initialLocations={locations} onRefetch={refetchLocations} />;
}
