import { strapi } from '@/lib/api/client';
import { MapPageClient, Location } from '@/components/map';

async function getFirstLocation(): Promise<Location | null> {
  try {
    const response = await strapi.collection('locations').find<Location>({
      sort: 'createdAt:desc',
      pagination: { pageSize: 1 },
      populate: '*',
    });

    return response.data[0] ?? null;
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return null;
  }
}

export default async function Home() {
  const location = await getFirstLocation();

  if (!location?.mapData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-black dark:text-white">No locations found</p>
      </div>
    );
  }

  async function refetchLocation(): Promise<Location | null> {
    'use server';
    return getFirstLocation();
  }

  return <MapPageClient initialLocation={location} onRefetch={refetchLocation} />;
}
