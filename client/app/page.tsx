'use client'

import { LocationMap, MapLocation } from "@/components/LocationMap";
import { useCollection } from "@/lib/api/use-strapi";

type Location = {
  id: number;
  documentId: string;
  mapData: MapLocation;
};

export default function Home() {
  const { data: locations, isLoading, isError } = useCollection<Location>(
    'locations',
    { sort: 'createdAt:desc', pagination: { pageSize: 10 }, populate: '*' }
  );

  const firstLocation = locations?.[0]?.mapData;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-black dark:text-white">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-red-500">Failed to load locations</p>
      </div>
    );
  }

  if (!firstLocation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-black dark:text-white">No locations found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
      <h1 className="mb-4 text-2xl font-semibold text-black dark:text-white">
        Location Map
      </h1>
      <div className="h-[500px] w-full max-w-4xl overflow-hidden rounded-lg shadow-lg">
        <LocationMap location={firstLocation} />
      </div>
    </div>
  );
}
