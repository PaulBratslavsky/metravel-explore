'use client';

import { useState, useCallback, useTransition } from 'react';
import { LocationMap } from './LocationMap';
import { Location } from './types';

type MapPageClientProps = {
  initialLocation: Location;
  onRefetch: () => Promise<Location | null>;
};

export function MapPageClient({ initialLocation, onRefetch }: Readonly<MapPageClientProps>) {
  const [location, setLocation] = useState(initialLocation);
  const [mapKey, setMapKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      const newLocation = await onRefetch();
      if (newLocation) {
        setLocation(newLocation);
        setMapKey((prev) => prev + 1);
      }
    });
  }, [onRefetch]);

  return (
    <div className="relative min-h-screen">
      <LocationMap
        key={mapKey}
        location={location.mapData}
        searchable
        onRefresh={handleRefresh}
        isRefreshing={isPending}
      />

      <div className="absolute bottom-14 left-4 right-4 z-10 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:bg-black/90">
        <h1 className="truncate text-lg font-semibold text-black dark:text-white">
          {location.name || 'Location'}
        </h1>
        {location.mapData.address && (
          <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
            {location.mapData.address}
          </p>
        )}
      </div>
    </div>
  );
}
